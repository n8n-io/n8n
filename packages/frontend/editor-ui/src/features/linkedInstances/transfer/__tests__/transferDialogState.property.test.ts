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

	it('warns exactly when a check could not tell', () => {
		fc.assert(
			fc.property(preflightArb, (preflight) => {
				const { warnings } = transferDialogState(preflight);

				expect(warnings.includes('nodeTypesUnchecked')).toBe(preflight.nodeTypeCheck === 'unknown');
				expect(warnings.includes('credentialsUnchecked')).toBe(
					preflight.credentials.some(({ status }) => status === 'unknown'),
				);
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
	it('says that nothing runs exactly when the workflow turns off here and the copy stays off', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const options = transferOptions(input);
				const request = transferRequest('wf-1', options, choice);
				const hints = transferHints(transferDialogState(preflight), options, choice);

				expect(hints.includes('nothingRuns')).toBe(
					request.deactivateLocal === true && request.publish !== true,
				);
			}),
		);
	});

	it('warns that the copy stays off only when the move asks to publish it', () => {
		fc.assert(
			fc.property(preflightArb, optionsArb, choiceArb, (preflight, input, choice) => {
				const options = transferOptions(input);
				const request = transferRequest('wf-1', options, choice);
				const hints = transferHints(transferDialogState(preflight), options, choice);
				const emptyCredential = preflight.credentials.some(
					({ status }) => status === 'needs-set-up',
				);

				expect(hints.includes('staysOffUntilSetUp')).toBe(
					request.publish === true && emptyCredential,
				);
				if (hints.includes('staysOnHereUntilLive')) {
					expect(hints).toContain('staysOffUntilSetUp');
					expect(request.deactivateLocal).toBe(true);
				}
			}),
		);
	});
});
