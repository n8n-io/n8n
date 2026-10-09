import {
	LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES,
	type LinkedInstanceTransferPreflight,
} from '@n8n/api-types';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	transferDialogState,
	transferHints,
	transferOptions,
	transferRequest,
	transferStatus,
	type TransferChoice,
	type TransferMoveStatus,
	type TransferOptionsInput,
} from '../transferDialogState';

const credentialArb = fc.record({
	name: fc.string({ maxLength: 20 }),
	type: fc.string({ maxLength: 20 }),
	status: fc.constantFrom(...LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES),
});

const preflightArb: fc.Arbitrary<LinkedInstanceTransferPreflight> = fc.record({
	workflowName: fc.string(),
	moves: fc.record({ nodes: fc.nat({ max: 500 }) }),
	nodeTypeCheck: fc.constantFrom('checked' as const, 'unknown' as const),
	missingNodeTypes: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 4 }),
	credentials: fc.array(credentialArb, { maxLength: 8 }),
	targetProject: fc.option(fc.record({ id: fc.uuid(), name: fc.string() }), { nil: null }),
	subWorkflowCalls: fc.array(
		fc.record({ id: fc.uuid(), name: fc.option(fc.string(), { nil: null }) }),
		{ maxLength: 4 },
	),
});

const optionsArb = fc.record({
	liveHere: fc.boolean(),
	canUnpublish: fc.boolean(),
	offerTurnOn: fc.boolean(),
});

const choiceArb = fc.record({ turnOffHere: fc.boolean(), turnOn: fc.boolean() });

describe('transferDialogState (property)', () => {
	it('can move exactly when no node type is missing and no other workflow is called', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const { canMove } = transferDialogState(preflight);

				expect(canMove).toBe(
					preflight.missingNodeTypes.length === 0 && preflight.subWorkflowCalls.length === 0,
				);
			}),
		);
	});

	it('cannot move while a node type is missing, whatever else the preflight says', () => {
		fc.assert(
			fc.property(preflightArb, fc.string({ minLength: 1 }), (preflight, nodeType) => {
				const state = transferDialogState({
					...preflight,
					missingNodeTypes: [...preflight.missingNodeTypes, nodeType],
				});

				expect(state.canMove).toBe(false);
			}),
		);
	});

	it('puts every credential in exactly one list and keeps the order', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const state = transferDialogState(preflight);
				const matched = preflight.credentials.filter(({ status }) => status === 'matched');
				const others = preflight.credentials.filter(({ status }) => status !== 'matched');

				expect(state.matchedCredentials).toEqual(matched.map(({ name }) => name));
				expect(state.needsSetUp).toEqual(others);
			}),
		);
	});

	it('warns exactly when the credential check could not tell', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const { warnings, nodeTypesChecked } = transferDialogState(preflight);
				const unknown = preflight.credentials.some(({ status }) => status === 'unknown');

				expect(warnings).toEqual(unknown ? ['credentialsUnchecked'] : []);
				expect(nodeTypesChecked).toBe(preflight.nodeTypeCheck === 'checked');
			}),
		);
	});

	it('shows the counts and the project of the preflight', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const state = transferDialogState(preflight);

				expect(state.nodeCount).toBe(preflight.moves.nodes);
				expect(state.targetProjectName).toBe(preflight.targetProject?.name ?? null);
				expect(state.missingNodeTypes).toEqual(preflight.missingNodeTypes);
				expect(state.subWorkflowCalls).toEqual(preflight.subWorkflowCalls);
			}),
		);
	});
});

describe('transferRequest (property)', () => {
	it('publishes and turns off only what the dialog offered and the user picked', () => {
		fc.assert(
			fc.property(fc.uuid(), optionsArb, choiceArb, (workflowId, input, choice) => {
				const options = transferOptions(input);
				const request = transferRequest(workflowId, options, choice);

				expect(request.workflowId).toBe(workflowId);
				expect(request.publish).toBe(input.offerTurnOn && choice.turnOn);
				expect(request.deactivateLocal).toBe(
					input.liveHere && input.canUnpublish && choice.turnOffHere,
				);
			}),
		);
	});

	it('never turns off a workflow that is not live here', () => {
		fc.assert(
			fc.property(fc.uuid(), optionsArb, choiceArb, (workflowId, input, choice) => {
				const options = transferOptions({ ...input, liveHere: false });

				expect(transferRequest(workflowId, options, choice).deactivateLocal).toBe(false);
			}),
		);
	});
});

describe('transferHints (property)', () => {
	const hintsFor = (
		preflight: LinkedInstanceTransferPreflight,
		input: TransferOptionsInput,
		choice: TransferChoice,
	) => {
		const options = transferOptions(input);
		return {
			request: transferRequest('wf-1', options, choice),
			hints: transferHints(transferDialogState(preflight), options, choice),
		};
	};

	it('says that the workflow turns off here exactly when the move turns it off and does not publish', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { request, hints } = hintsFor(preflight, input, choice);

				expect(hints.includes('turnsOffHere')).toBe(request.deactivateLocal && !request.publish);
			}),
		);
	});

	it('shows no hint about the copy there unless the move asks to publish it', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { request, hints } = hintsFor(preflight, input, choice);

				if (!request.publish) {
					expect(hints).toEqual(request.deactivateLocal ? ['turnsOffHere'] : []);
				}
			}),
		);
	});

	it('warns that this version stays off exactly when a publish meets an empty credential', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { request, hints } = hintsFor(preflight, input, choice);
				const emptyCredential = preflight.credentials.some(
					({ status }) => status === 'needs-set-up',
				);

				expect(hints.includes('notLiveUntilSetUp')).toBe(request.publish && emptyCredential);
			}),
		);
	});

	it('says that the workflow here stays on only when the move asks to turn it off and to publish', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { request, hints } = hintsFor(preflight, input, choice);
				const staysOn =
					hints.includes('staysOnHere') || hints.includes('nodeTypesUncheckedStaysOnHere');

				if (staysOn) expect(request.deactivateLocal && request.publish).toBe(true);
				if (hints.includes('staysOnHere')) expect(hints).toContain('notLiveUntilSetUp');
			}),
		);
	});

	it('mentions the node type check only for a publish that no empty credential blocks', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { request, hints } = hintsFor(preflight, input, choice);
				const nodeTypeHint =
					hints.includes('nodeTypesUnchecked') || hints.includes('nodeTypesUncheckedStaysOnHere');

				expect(nodeTypeHint).toBe(
					request.publish &&
						preflight.nodeTypeCheck === 'unknown' &&
						!hints.includes('notLiveUntilSetUp'),
				);
			}),
		);
	});

	it('never repeats a hint', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const { hints } = hintsFor(preflight, input, choice);

				expect(new Set(hints).size).toBe(hints.length);
			}),
		);
	});
});

describe('transferStatus (property)', () => {
	const moveArb = fc.constantFrom<TransferMoveStatus>('idle', 'moving', 'failed');

	it('says "moving" while the move runs, and nothing while an error shows', () => {
		fc.assert(
			fc.property(preflightArb, moveArb, (preflight, move) => {
				const status = transferStatus(transferDialogState(preflight), move);

				expect(status.kind === 'moving').toBe(move === 'moving');
				expect(status.kind === 'silent').toBe(move === 'failed');
			}),
		);
	});

	it('says that the workflow cannot move exactly when Move is disabled by the check', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const state = transferDialogState(preflight);
				const status = transferStatus(state, 'idle');

				expect(status.kind === 'cannotMove').toBe(!state.canMove);
				if (status.kind === 'ready') {
					expect(status.nodeCount).toBe(preflight.moves.nodes);
					expect(status.needsSetUp).toBe(
						preflight.credentials.filter(({ status: s }) => s !== 'matched').length,
					);
				}
			}),
		);
	});
});
