import { transferPreflight } from '../../__tests__/linkedInstances.fixtures';
import {
	transferDialogState,
	transferHints,
	transferOptions,
	transferRequest,
	type TransferChoice,
	type TransferOptions,
} from '../transferDialogState';

const credential = (name: string, status: 'matched' | 'needs-set-up' | 'unknown') => ({
	name,
	type: `${name.toLowerCase()}Api`,
	status,
});

describe('transferDialogState', () => {
	it('counts the nodes and names the target project', () => {
		const state = transferDialogState(
			transferPreflight({ moves: { nodes: 7 }, targetProject: { id: 'p-2', name: 'Ops' } }),
		);

		expect(state.nodeCount).toBe(7);
		expect(state.targetProjectName).toBe('Ops');
	});

	it('names no project when the move goes to the personal project', () => {
		const state = transferDialogState(transferPreflight({ targetProject: null }));

		expect(state.targetProjectName).toBeNull();
	});

	it('lists matched credentials by name and the others as needing set-up, in order', () => {
		const state = transferDialogState(
			transferPreflight({
				nodeTypeCheck: 'checked',
				credentials: [
					credential('Slack', 'matched'),
					credential('Gmail', 'needs-set-up'),
					credential('Notion', 'unknown'),
					credential('Jira', 'matched'),
				],
			}),
		);

		expect(state.matchedCredentials).toEqual(['Slack', 'Jira']);
		expect(state.needsSetUp).toEqual([
			{ name: 'Gmail', type: 'gmailApi', status: 'needs-set-up' },
			{ name: 'Notion', type: 'notionApi', status: 'unknown' },
		]);
	});

	it('can move a workflow with nothing under "Can\'t move"', () => {
		const state = transferDialogState(transferPreflight());

		expect(state.canMove).toBe(true);
		expect(state.missingNodeTypes).toEqual([]);
		expect(state.subWorkflowCalls).toEqual([]);
	});

	it('cannot move a workflow that uses a node type the linked instance does not have', () => {
		const state = transferDialogState(
			transferPreflight({ nodeTypeCheck: 'checked', missingNodeTypes: ['n8n-nodes-acme.thing@1'] }),
		);

		expect(state.canMove).toBe(false);
		expect(state.missingNodeTypes).toEqual(['n8n-nodes-acme.thing@1']);
	});

	it('cannot move a workflow that calls other workflows by ID, also hidden ones', () => {
		const calls = [
			{ id: 'wf-2', name: 'Enrich lead' },
			{ id: 'wf-3', name: null },
		];
		const state = transferDialogState(transferPreflight({ subWorkflowCalls: calls }));

		expect(state.canMove).toBe(false);
		expect(state.subWorkflowCalls).toEqual(calls);
	});

	it('copies the lists, so a change to the state does not change the preflight', () => {
		const preflight = transferPreflight({
			missingNodeTypes: ['a@1'],
			subWorkflowCalls: [{ id: 'wf-2', name: 'Sub' }],
		});
		const state = transferDialogState(preflight);

		state.missingNodeTypes.push('b@1');
		state.subWorkflowCalls.pop();

		expect(preflight.missingNodeTypes).toEqual(['a@1']);
		expect(preflight.subWorkflowCalls).toHaveLength(1);
	});

	describe('warnings', () => {
		it('warns that node types are checked only during the move', () => {
			expect(transferDialogState(transferPreflight({ nodeTypeCheck: 'unknown' })).warnings).toEqual(
				['nodeTypesUnchecked'],
			);
			expect(transferDialogState(transferPreflight({ nodeTypeCheck: 'checked' })).warnings).toEqual(
				[],
			);
		});

		it('warns when the linked instance did not tell the state of a credential', () => {
			const state = transferDialogState(
				transferPreflight({
					nodeTypeCheck: 'checked',
					credentials: [credential('Slack', 'matched'), credential('Gmail', 'unknown')],
				}),
			);

			expect(state.warnings).toEqual(['credentialsUnchecked']);
		});

		it('does not warn about credentials that only need set-up', () => {
			const state = transferDialogState(
				transferPreflight({
					nodeTypeCheck: 'checked',
					credentials: [credential('Gmail', 'needs-set-up')],
				}),
			);

			expect(state.warnings).toEqual([]);
		});

		it('lists the node type warning before the credential warning', () => {
			const state = transferDialogState(
				transferPreflight({ credentials: [credential('Gmail', 'unknown')] }),
			);

			expect(state.warnings).toEqual(['nodeTypesUnchecked', 'credentialsUnchecked']);
		});
	});
});

describe('transferOptions', () => {
	it('offers to turn off the workflow here only when it is live and the user can turn it off', () => {
		const offered = (liveHere: boolean, canUnpublish: boolean) =>
			transferOptions({ liveHere, canUnpublish, offerTurnOn: false }).showTurnOffHere;

		expect(offered(true, true)).toBe(true);
		expect(offered(true, false)).toBe(false);
		expect(offered(false, true)).toBe(false);
		expect(offered(false, false)).toBe(false);
	});

	it('offers to turn on the copy only when the user asked for a live automation', () => {
		expect(
			transferOptions({ liveHere: false, canUnpublish: false, offerTurnOn: true }).showTurnOn,
		).toBe(true);
		expect(
			transferOptions({ liveHere: true, canUnpublish: true, offerTurnOn: false }).showTurnOn,
		).toBe(false);
	});
});

describe('transferHints', () => {
	const both: TransferOptions = { showTurnOffHere: true, showTurnOn: true };
	const needsSetUp = {
		needsSetUp: [{ name: 'Gmail', type: 'gmailApi', status: 'needs-set-up' as const }],
	};
	const ready = { needsSetUp: [] };
	const choice = (turnOffHere: boolean, turnOn: boolean): TransferChoice => ({
		turnOffHere,
		turnOn,
	});

	it('shows no hint before the user picks anything', () => {
		expect(transferHints(needsSetUp, both, choice(false, false))).toEqual([]);
	});

	it('says that nothing runs when the workflow turns off here and the copy stays off', () => {
		expect(transferHints(ready, both, choice(true, false))).toEqual(['nothingRuns']);
	});

	it('says nothing more when the copy turns on and needs no set-up', () => {
		expect(transferHints(ready, both, choice(true, true))).toEqual([]);
		expect(transferHints(ready, both, choice(false, true))).toEqual([]);
	});

	it('says that the copy stays off until its credentials are set up', () => {
		expect(transferHints(needsSetUp, both, choice(false, true))).toEqual(['staysOffUntilSetUp']);
	});

	it('also says that the workflow here stays on when the user asked to turn it off', () => {
		expect(transferHints(needsSetUp, both, choice(true, true))).toEqual([
			'staysOffUntilSetUp',
			'staysOnHereUntilLive',
		]);
	});

	it('treats a credential that was not checked as no reason to stay off', () => {
		const unknown = {
			needsSetUp: [{ name: 'Notion', type: 'notionApi', status: 'unknown' as const }],
		};

		expect(transferHints(unknown, both, choice(false, true))).toEqual([]);
	});

	it('ignores a choice that the dialog does not offer', () => {
		const onlyTurnOn: TransferOptions = { showTurnOffHere: false, showTurnOn: true };
		const onlyTurnOff: TransferOptions = { showTurnOffHere: true, showTurnOn: false };

		expect(transferHints(needsSetUp, onlyTurnOn, choice(true, true))).toEqual([
			'staysOffUntilSetUp',
		]);
		expect(transferHints(needsSetUp, onlyTurnOff, choice(true, true))).toEqual(['nothingRuns']);
	});
});

describe('transferRequest', () => {
	it('asks for each offered choice that the user picked', () => {
		expect(
			transferRequest(
				'wf-1',
				{ showTurnOffHere: true, showTurnOn: true },
				{ turnOffHere: true, turnOn: true },
			),
		).toEqual({ workflowId: 'wf-1', publish: true, deactivateLocal: true });
	});

	it('asks for nothing that the user did not pick', () => {
		expect(
			transferRequest(
				'wf-1',
				{ showTurnOffHere: true, showTurnOn: true },
				{ turnOffHere: false, turnOn: false },
			),
		).toEqual({ workflowId: 'wf-1', publish: false, deactivateLocal: false });
	});

	it('never asks for a choice that the dialog did not offer', () => {
		expect(
			transferRequest(
				'wf-1',
				{ showTurnOffHere: false, showTurnOn: false },
				{ turnOffHere: true, turnOn: true },
			),
		).toEqual({ workflowId: 'wf-1', publish: false, deactivateLocal: false });
	});
});
