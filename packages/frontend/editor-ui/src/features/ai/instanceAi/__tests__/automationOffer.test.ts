import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import {
	automationOfferKey,
	countSuccessfulRuns,
	findAutomationOfferCandidate,
	type AutomationOfferWorkflow,
} from '../automationOffer';

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return { toolCallId: 'tc', toolName: 'some-tool', args: {}, isLoading: false, ...overrides };
}

function makeAgentNode(
	toolCalls: InstanceAiToolCallState[],
	children: InstanceAiAgentNode[] = [],
): InstanceAiAgentNode {
	return {
		agentId: 'agent',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls,
		children,
		timeline: [],
	};
}

function makeMessage(agentTree?: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'msg',
		role: agentTree ? 'assistant' : 'user',
		createdAt: '2026-10-07T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree,
	};
}

/** One assistant message for each group of calls, in order. */
function messagesWith(...groups: InstanceAiToolCallState[][]): InstanceAiMessage[] {
	return groups.map((calls) => makeMessage(makeAgentNode(calls)));
}

const executionsRun = (workflowId: unknown, status: string) =>
	makeToolCall({
		toolName: 'executions',
		args: { action: 'run', workflowId },
		result: { executionId: 'exec-1', status },
	});

const verifyRun = (workflowId: unknown, success: boolean, status = 'success') =>
	makeToolCall({
		toolName: 'verify-built-workflow',
		args: { workflowId },
		result: { success, status, executionId: 'exec-2' },
	});

const proposal = (workflowId: unknown, overrides: Partial<InstanceAiToolCallState> = {}) =>
	makeToolCall({ toolName: 'propose_automation', args: { workflowId }, ...overrides });

type LifecycleAction = 'publish' | 'unpublish' | 'delete' | 'unarchive';

/** A `workflows` call that changes the publish or archive state of a workflow. */
const lifecycle = (
	action: LifecycleAction,
	workflowId: unknown,
	overrides: Partial<InstanceAiToolCallState> = {},
) =>
	makeToolCall({
		toolName: 'workflows',
		args: { action, workflowId },
		result:
			action === 'publish'
				? { success: true, activeVersionId: 'version-1', publishedWorkflowIds: [workflowId] }
				: { success: true },
		...overrides,
	});

/** An ISO time on a fixed day, `second` seconds after midnight. */
const at = (second: number) => new Date(Date.UTC(2026, 9, 7, 0, 0, second)).toISOString();

const workflow = (id: string, overrides: Partial<AutomationOfferWorkflow> = {}) => ({
	id,
	name: `Workflow ${id}`,
	...overrides,
});

function find(
	messages: InstanceAiMessage[],
	producedWorkflows: AutomationOfferWorkflow[] = [workflow('wf-1')],
	dismissedKeys: string[] = [],
	previewFailures?: ReadonlyMap<string, number>,
) {
	return findAutomationOfferCandidate({
		messages,
		producedWorkflows,
		dismissedKeys,
		previewFailures,
	});
}

describe('automationOfferKey', () => {
	it('scopes the dismissal to the workflow', () => {
		expect(automationOfferKey('wf-1')).toBe('automation-offer:wf-1');
		expect(automationOfferKey('wf-2')).not.toBe(automationOfferKey('wf-1'));
	});
});

describe('findAutomationOfferCandidate', () => {
	describe('successful runs', () => {
		it('offers a workflow that an executions run completed', () => {
			expect(find(messagesWith([executionsRun('wf-1', 'success')]))).toEqual({
				workflowId: 'wf-1',
				name: 'Workflow wf-1',
			});
		});

		it('offers a workflow that verify-built-workflow passed', () => {
			expect(find(messagesWith([verifyRun('wf-1', true)]))).toEqual({
				workflowId: 'wf-1',
				name: 'Workflow wf-1',
			});
		});

		it('counts a run in a nested sub-agent', () => {
			const nested = makeAgentNode(
				[],
				[makeAgentNode([], [makeAgentNode([executionsRun('wf-1', 'success')])])],
			);

			expect(find([makeMessage(), makeMessage(nested)])?.workflowId).toBe('wf-1');
		});

		it('offers nothing for no messages or no produced workflows', () => {
			expect(find([])).toBeUndefined();
			expect(find(messagesWith([executionsRun('wf-1', 'success')]), [])).toBeUndefined();
		});
	});

	describe('runs that do not count', () => {
		it.each(['error', 'running', 'waiting', 'canceled'])(
			'offers nothing when the executions run has status "%s"',
			(status) => {
				expect(find(messagesWith([executionsRun('wf-1', status)]))).toBeUndefined();
			},
		);

		it('reads the verdict of verify-built-workflow, not the execution status', () => {
			expect(find(messagesWith([verifyRun('wf-1', false, 'success')]))).toBeUndefined();
		});

		it.each(['list', 'get', 'debug', 'run-step', 'stop'])(
			'ignores the executions action "%s"',
			(action) => {
				const call = makeToolCall({
					toolName: 'executions',
					args: { action, workflowId: 'wf-1' },
					result: { status: 'success', success: true },
				});

				expect(find(messagesWith([call]))).toBeUndefined();
			},
		);

		it('ignores other tools with a successful result for the workflow', () => {
			const call = makeToolCall({
				toolName: 'build-workflow',
				args: { action: 'run', workflowId: 'wf-1' },
				result: { status: 'success', success: true, workflowId: 'wf-1' },
			});

			expect(find(messagesWith([call]))).toBeUndefined();
		});

		it('offers nothing for a run of a different workflow', () => {
			expect(find(messagesWith([executionsRun('wf-2', 'success')]))).toBeUndefined();
		});

		it('offers nothing while the run is still loading', () => {
			const call = { ...executionsRun('wf-1', 'success'), isLoading: true };

			expect(find(messagesWith([call]))).toBeUndefined();
		});

		it('offers nothing for a run that failed without a result', () => {
			const call = makeToolCall({
				toolName: 'executions',
				args: { action: 'run', workflowId: 'wf-1' },
				error: 'Request failed',
			});

			expect(find(messagesWith([call]))).toBeUndefined();
		});

		it('offers nothing when the result is not an object', () => {
			const call = { ...executionsRun('wf-1', 'success'), result: 'success' };

			expect(find(messagesWith([call]))).toBeUndefined();
		});

		it('ignores a run without a workflow id', () => {
			expect(find(messagesWith([executionsRun(undefined, 'success')]))).toBeUndefined();
		});
	});

	describe('latest run wins', () => {
		it('offers nothing when the latest run failed after a success', () => {
			const messages = messagesWith(
				[executionsRun('wf-1', 'success')],
				[executionsRun('wf-1', 'error')],
			);

			expect(find(messages)).toBeUndefined();
		});

		it('offers the workflow when the latest run succeeded after a failure', () => {
			const messages = messagesWith([verifyRun('wf-1', false), executionsRun('wf-1', 'success')]);

			expect(find(messages)?.workflowId).toBe('wf-1');
		});

		it('keeps the last finished run while a new run is loading', () => {
			const loading = { ...executionsRun('wf-1', 'error'), isLoading: true };

			expect(find(messagesWith([executionsRun('wf-1', 'success'), loading]))?.workflowId).toBe(
				'wf-1',
			);
		});

		it('treats a sub-agent run as more recent than the calls of its parent', () => {
			const tree = makeAgentNode(
				[executionsRun('wf-1', 'success')],
				[makeAgentNode([executionsRun('wf-1', 'error')])],
			);

			expect(find([makeMessage(tree)])).toBeUndefined();
		});

		it('does not let a failed run of one workflow hide another', () => {
			const messages = messagesWith([
				executionsRun('wf-1', 'success'),
				executionsRun('wf-2', 'error'),
			]);

			expect(find(messages, [workflow('wf-1'), workflow('wf-2')])?.workflowId).toBe('wf-1');
		});
	});

	describe('existing proposal', () => {
		const ran = [executionsRun('wf-1', 'success')];

		it('offers nothing when the thread already proposed the automation', () => {
			expect(find(messagesWith(ran, [proposal('wf-1')]))).toBeUndefined();
		});

		it('offers nothing while the proposal waits for the user', () => {
			const pending = proposal('wf-1', { isLoading: true, confirmationStatus: 'pending' });

			expect(find(messagesWith(ran, [pending]))).toBeUndefined();
		});

		it('counts a proposal made before the run', () => {
			expect(find(messagesWith([proposal('wf-1')], ran))).toBeUndefined();
		});

		it('still offers when the proposal is for a different workflow', () => {
			expect(find(messagesWith(ran, [proposal('wf-2')]))?.workflowId).toBe('wf-1');
		});
	});

	describe('dismissal and archive', () => {
		const messages = messagesWith([executionsRun('wf-1', 'success')]);

		it('offers nothing once the user dismissed the offer for the workflow', () => {
			expect(find(messages, undefined, [automationOfferKey('wf-1')])).toBeUndefined();
		});

		it('still offers when a different key was dismissed', () => {
			const dismissed = [automationOfferKey('wf-2'), 'test-agent:wf-1', 'wf-1'];

			expect(find(messages, undefined, dismissed)?.workflowId).toBe('wf-1');
		});

		it('offers nothing for an archived workflow', () => {
			expect(find(messages, [workflow('wf-1', { archived: true })])).toBeUndefined();
		});

		it('offers a workflow marked as not archived', () => {
			expect(find(messages, [workflow('wf-1', { archived: false })])?.workflowId).toBe('wf-1');
		});
	});

	describe('several candidates', () => {
		const bothRan = messagesWith([executionsRun('wf-2', 'success')], [verifyRun('wf-1', true)]);

		it('offers the most recently produced workflow', () => {
			expect(find(bothRan, [workflow('wf-1'), workflow('wf-2')])).toEqual({
				workflowId: 'wf-2',
				name: 'Workflow wf-2',
			});
		});

		it.each([
			['dismissed', [workflow('wf-1'), workflow('wf-2')], [automationOfferKey('wf-2')]],
			['archived', [workflow('wf-1'), workflow('wf-2', { archived: true })], []],
		])('falls back to an older workflow when the newest is %s', (_reason, produced, dismissed) => {
			expect(find(bothRan, produced, dismissed)?.workflowId).toBe('wf-1');
		});

		it('falls back to an older workflow when the newest did not run', () => {
			const messages = messagesWith([executionsRun('wf-1', 'success')]);

			expect(find(messages, [workflow('wf-1'), workflow('wf-2')])?.workflowId).toBe('wf-1');
		});

		it('falls back to an older workflow when the thread published the newest', () => {
			const messages = messagesWith(
				[executionsRun('wf-1', 'success'), executionsRun('wf-2', 'success')],
				[lifecycle('publish', 'wf-2')],
			);

			expect(find(messages, [workflow('wf-1'), workflow('wf-2')])?.workflowId).toBe('wf-1');
		});
	});

	describe('publish and archive calls in the thread', () => {
		const ran = [executionsRun('wf-1', 'success')];

		it.each(['publish', 'delete'] as const)('offers nothing after a successful %s', (action) => {
			expect(find(messagesWith(ran, [lifecycle(action, 'wf-1')]))).toBeUndefined();
		});

		it.each([
			['publish', 'unpublish', 'wf-1'],
			['delete', 'unarchive', 'wf-1'],
			['unpublish', 'publish', undefined],
			['unarchive', 'delete', undefined],
		] as const)('lets the later of %s and %s decide', (first, second, offered) => {
			const messages = messagesWith(ran, [lifecycle(first, 'wf-1')], [lifecycle(second, 'wf-1')]);

			expect(find(messages)?.workflowId).toBe(offered);
		});

		it('counts a publish made before the run', () => {
			expect(find(messagesWith([lifecycle('publish', 'wf-1')], ran))).toBeUndefined();
		});

		it('keeps the publish state and the archive state apart', () => {
			const messages = messagesWith(
				ran,
				[lifecycle('publish', 'wf-1')],
				[lifecycle('unarchive', 'wf-1')],
			);

			expect(find(messages)).toBeUndefined();
		});

		it.each([
			['its parent workflow', 'wf-parent', ['wf-1', 'wf-parent']],
			['no workflow id', undefined, ['wf-1']],
		])('offers nothing for a workflow in the published ids of a call for %s', (_label, id, ids) => {
			const call = lifecycle('publish', id, {
				result: { success: true, publishedWorkflowIds: ids },
			});

			expect(find(messagesWith(ran, [call]))).toBeUndefined();
		});

		it.each([
			['are not strings', [1, null, { id: 'wf-1' }]],
			['are not a list', 'wf-1'],
		])('ignores published ids that %s', (_label, publishedWorkflowIds) => {
			const call = lifecycle('publish', 'wf-2', {
				result: { success: true, publishedWorkflowIds },
			});

			expect(find(messagesWith(ran, [call]))?.workflowId).toBe('wf-1');
		});

		it.each([
			[
				'was denied',
				{ result: { success: false, denied: true, reason: 'User denied the action' } },
			],
			['failed', { result: { success: false, error: 'Publish failed' } }],
			['has no result', { result: undefined, error: 'Request failed' }],
			['has a result that is not an object', { result: 'success' }],
			['is still loading', { isLoading: true, confirmationStatus: 'pending' as const }],
		])('still offers when the publish call %s', (_label, overrides) => {
			expect(find(messagesWith(ran, [lifecycle('publish', 'wf-1', overrides)]))?.workflowId).toBe(
				'wf-1',
			);
		});

		it('still offers when the publish is for a different workflow', () => {
			expect(find(messagesWith(ran, [lifecycle('publish', 'wf-2')]))?.workflowId).toBe('wf-1');
		});

		it.each([
			['another tool', { toolName: 'executions' }],
			['another action', { args: { action: 'get', workflowId: 'wf-1' } }],
			['an inherited object key as action', { args: { action: 'toString', workflowId: 'wf-1' } }],
		])('ignores a successful call of %s', (_label, overrides) => {
			expect(find(messagesWith(ran, [lifecycle('publish', 'wf-1', overrides)]))?.workflowId).toBe(
				'wf-1',
			);
		});
	});

	describe('completion time', () => {
		it('lets a later parent run win over an earlier sub-agent run', () => {
			const tree = makeAgentNode(
				[{ ...executionsRun('wf-1', 'success'), completedAt: at(10) }],
				[makeAgentNode([{ ...executionsRun('wf-1', 'error'), completedAt: at(5) }])],
			);

			expect(find([makeMessage(tree)])?.workflowId).toBe('wf-1');
		});

		it('lets a later parent failure win over an earlier sub-agent success', () => {
			const tree = makeAgentNode(
				[{ ...executionsRun('wf-1', 'error'), completedAt: at(10) }],
				[makeAgentNode([{ ...verifyRun('wf-1', true), completedAt: at(5) }])],
			);

			expect(find([makeMessage(tree)])).toBeUndefined();
		});

		it('lets a later parent unpublish win over an earlier sub-agent publish', () => {
			const tree = makeAgentNode(
				[
					executionsRun('wf-1', 'success'),
					{ ...lifecycle('unpublish', 'wf-1'), completedAt: at(9) },
				],
				[makeAgentNode([{ ...lifecycle('publish', 'wf-1'), completedAt: at(3) }])],
			);

			expect(find([makeMessage(tree)])?.workflowId).toBe('wf-1');
		});

		it('uses the walk order for calls that finished at the same time', () => {
			const messages = messagesWith([
				{ ...executionsRun('wf-1', 'error'), completedAt: at(5) },
				{ ...executionsRun('wf-1', 'success'), completedAt: at(5) },
			]);

			expect(find(messages)?.workflowId).toBe('wf-1');
		});

		it.each([
			['the earlier call', [at(5), undefined]],
			['the later call', [undefined, at(5)]],
		])('uses the walk order when %s has no completion time', (_label, times) => {
			const messages = messagesWith([
				{ ...executionsRun('wf-1', 'error'), completedAt: times[0] },
				{ ...executionsRun('wf-1', 'success'), completedAt: times[1] },
			]);

			expect(find(messages)?.workflowId).toBe('wf-1');
		});
	});

	describe('preview failures', () => {
		const ranOnce = messagesWith([executionsRun('wf-1', 'success')]);

		it('offers nothing when the preview run failed after the last successful run', () => {
			expect(find(ranOnce, undefined, [], new Map([['wf-1', 1]]))).toBeUndefined();
		});

		it('offers the workflow again after a newer successful run', () => {
			const ranTwice = messagesWith([executionsRun('wf-1', 'success')], [verifyRun('wf-1', true)]);

			expect(find(ranTwice, undefined, [], new Map([['wf-1', 1]]))?.workflowId).toBe('wf-1');
		});

		it('offers the workflow when its first successful run came after the failure', () => {
			expect(find(ranOnce, undefined, [], new Map([['wf-1', 0]]))?.workflowId).toBe('wf-1');
		});

		it('still offers when the preview failure is for a different workflow', () => {
			expect(find(ranOnce, undefined, [], new Map([['wf-2', 5]]))?.workflowId).toBe('wf-1');
		});

		it('falls back to an older workflow when the newest failed in the preview', () => {
			const messages = messagesWith([
				executionsRun('wf-1', 'success'),
				executionsRun('wf-2', 'success'),
			]);
			const produced = [workflow('wf-1'), workflow('wf-2')];

			expect(find(messages, produced, [], new Map([['wf-2', 1]]))?.workflowId).toBe('wf-1');
		});
	});
});

describe('countSuccessfulRuns', () => {
	it('counts finished successful runs of the workflow, also in sub-agents', () => {
		const tree = makeAgentNode(
			[executionsRun('wf-1', 'success'), executionsRun('wf-1', 'error')],
			[makeAgentNode([verifyRun('wf-1', true), verifyRun('wf-1', false)])],
		);
		const messages = [
			makeMessage(tree),
			makeMessage(),
			makeMessage(
				makeAgentNode([
					executionsRun('wf-2', 'success'),
					{ ...executionsRun('wf-1', 'success'), isLoading: true },
					executionsRun('wf-1', 'success'),
				]),
			),
		];

		expect(countSuccessfulRuns(messages, 'wf-1')).toBe(3);
		expect(countSuccessfulRuns(messages, 'wf-2')).toBe(1);
	});

	it('gives zero for a workflow without a successful run', () => {
		expect(countSuccessfulRuns(messagesWith([executionsRun('wf-1', 'error')]), 'wf-1')).toBe(0);
		expect(countSuccessfulRuns([], 'wf-1')).toBe(0);
	});
});

// --- Properties ---

const WORKFLOW_IDS = ['wf-a', 'wf-b', 'wf-c'] as const;
const workflowIdArb = fc.constantFrom(...WORKFLOW_IDS);
const LIFECYCLE_ACTIONS = ['publish', 'unpublish', 'delete', 'unarchive'] as const;

/** Calls that can change the result for the workflows that `idArb` gives. */
function relevantCallArbFor(idArb: fc.Arbitrary<string>) {
	const runCallArb = fc
		.record({
			workflowId: idArb,
			status: fc.constantFrom('success', 'success', 'error'),
			isLoading: fc.boolean(),
		})
		.map(({ workflowId, status, isLoading }) => ({
			...executionsRun(workflowId, status),
			isLoading,
		}));
	const verifyCallArb = fc
		.record({ workflowId: idArb, success: fc.boolean() })
		.map(({ workflowId, success }) => verifyRun(workflowId, success));
	const lifecycleCallArb = fc
		.record({ action: fc.constantFrom(...LIFECYCLE_ACTIONS), workflowId: idArb })
		.map(({ action, workflowId }) => lifecycle(action, workflowId));

	return fc.oneof(
		{ arbitrary: runCallArb, weight: 4 },
		{ arbitrary: verifyCallArb, weight: 3 },
		{ arbitrary: idArb.map((workflowId) => proposal(workflowId)), weight: 1 },
		{ arbitrary: lifecycleCallArb, weight: 1 },
	);
}

const relevantCallArb = relevantCallArbFor(workflowIdArb);
const callsArb = fc.array(relevantCallArb, { maxLength: 4 });

const agentTreeArb = fc
	.record({
		toolCalls: callsArb,
		children: fc.array(
			callsArb.map((calls) => makeAgentNode(calls)),
			{ maxLength: 2 },
		),
	})
	.map(({ toolCalls, children }) => makeAgentNode(toolCalls, children));

const messagesArb = fc.array(
	fc.option(agentTreeArb, { nil: undefined }).map((tree) => makeMessage(tree)),
	{ minLength: 1, maxLength: 4 },
);

const producedWorkflowsArb = fc
	.uniqueArray(
		fc.record({ id: workflowIdArb, archived: fc.constantFrom(false, false, false, true) }),
		{
			selector: (entry) => entry.id,
			minLength: 1,
			maxLength: WORKFLOW_IDS.length,
		},
	)
	.map((entries) => entries.map((entry) => ({ ...entry, name: `Workflow ${entry.id}` })));

const dismissedKeysArb = fc.subarray(
	[...WORKFLOW_IDS.map(automationOfferKey), 'test-agent:wf-a', 'setup-panel-execute:wf-b'],
	{ maxLength: 2 },
);

const inputArb = fc.record({
	messages: messagesArb,
	producedWorkflows: producedWorkflowsArb,
	dismissedKeys: dismissedKeysArb,
});

/** Calls that must never change the result: other tools, other actions, other workflows. */
const unrelatedCallArb = fc.oneof(
	fc
		.record({
			toolName: fc.constantFrom('build-workflow', 'credentials', 'nodes', 'data-tables'),
			action: fc.constantFrom('run', ...LIFECYCLE_ACTIONS),
			workflowId: workflowIdArb,
		})
		.map(({ toolName, action, workflowId }) =>
			makeToolCall({
				toolName,
				args: { action, workflowId },
				result: {
					status: 'success',
					success: true,
					workflowId,
					publishedWorkflowIds: [workflowId],
				},
			}),
		),
	fc
		.record({
			action: fc.constantFrom('list', 'get', 'debug', 'run-step', 'stop'),
			workflowId: workflowIdArb,
			status: fc.constantFrom('success', 'error'),
		})
		.map(({ action, workflowId, status }) =>
			makeToolCall({
				toolName: 'executions',
				args: { action, workflowId },
				result: { status, success: status === 'success' },
			}),
		),
	fc
		.record({
			action: fc.constantFrom('run', 'get', 'list', 'validate', 'setup', 'list-versions'),
			workflowId: workflowIdArb,
		})
		.map(({ action, workflowId }) =>
			makeToolCall({
				toolName: 'workflows',
				args: { action, workflowId },
				result: { success: true, workflowId, publishedWorkflowIds: [workflowId] },
			}),
		),
	fc
		.record({
			action: fc.constantFrom(...LIFECYCLE_ACTIONS),
			workflowId: workflowIdArb,
			overrides: fc.constantFrom<Array<Partial<InstanceAiToolCallState>>>(
				{ result: { success: false, denied: true, reason: 'User denied the action' } },
				{ result: { success: false, error: 'Publish failed' } },
				{ result: undefined, error: 'Request failed' },
				{ isLoading: true, confirmationStatus: 'pending' },
			),
		})
		.map(({ action, workflowId, overrides }) => lifecycle(action, workflowId, overrides)),
	relevantCallArbFor(fc.constantFrom('wf-elsewhere', 'wf-other')),
);

/** Every agent node of the messages, parents before their children. */
function agentNodes(messages: InstanceAiMessage[]): InstanceAiAgentNode[] {
	const nodes: InstanceAiAgentNode[] = [];
	const visit = (node: InstanceAiAgentNode) => {
		nodes.push(node);
		node.children.forEach(visit);
	};
	messages.forEach((message) => message.agentTree && visit(message.agentTree));
	return nodes;
}

/** Inserts each call at a slot spread over every agent node, or in a new message. */
function withInsertedCalls(
	messages: InstanceAiMessage[],
	insertions: Array<{ call: InstanceAiToolCallState; slot: number; newMessage: boolean }>,
): InstanceAiMessage[] {
	const copy = structuredClone(messages);
	const nodes = agentNodes(copy);
	for (const { call, slot, newMessage } of insertions) {
		if (newMessage || nodes.length === 0) {
			copy.splice(slot % (copy.length + 1), 0, makeMessage(makeAgentNode([call])));
			continue;
		}
		const node = nodes[slot % nodes.length];
		node.toolCalls.splice(slot % (node.toolCalls.length + 1), 0, call);
	}
	return copy;
}

describe('findAutomationOfferCandidate properties', () => {
	it('never offers the returned workflow again once its key is dismissed', () => {
		fc.assert(
			fc.property(inputArb, (input) => {
				const candidate = findAutomationOfferCandidate(input);
				if (!candidate) return;
				const next = findAutomationOfferCandidate({
					...input,
					dismissedKeys: [...input.dismissedKeys, automationOfferKey(candidate.workflowId)],
				});
				expect(next?.workflowId).not.toBe(candidate.workflowId);
			}),
			{ numRuns: 300 },
		);
	});

	it('never offers the returned workflow again once the thread publishes or archives it', () => {
		fc.assert(
			fc.property(
				inputArb,
				fc.constantFrom<LifecycleAction>('publish', 'delete'),
				(input, action) => {
					const candidate = findAutomationOfferCandidate(input);
					if (!candidate) return;
					const messages = [
						...input.messages,
						...messagesWith([lifecycle(action, candidate.workflowId)]),
					];
					const next = findAutomationOfferCandidate({ ...input, messages });
					expect(next?.workflowId).not.toBe(candidate.workflowId);
				},
			),
			{ numRuns: 300 },
		);
	});

	it('gives the same result when unrelated tool calls are added', () => {
		const insertionsArb = fc.array(
			fc.record({ call: unrelatedCallArb, slot: fc.nat(), newMessage: fc.boolean() }),
			{ minLength: 1, maxLength: 6 },
		);
		fc.assert(
			fc.property(inputArb, insertionsArb, (input, insertions) => {
				const messages = withInsertedCalls(input.messages, insertions);

				expect(findAutomationOfferCandidate({ ...input, messages })).toEqual(
					findAutomationOfferCandidate(input),
				);
			}),
			{ numRuns: 300 },
		);
	});

	it('orders the calls by completion time when every call has one', () => {
		// The calls in time order, then the same calls spread over a nested tree.
		const scatteredArb = fc.record({
			calls: fc.array(relevantCallArb, { minLength: 1, maxLength: 8 }),
			slots: fc.array(fc.nat(), { minLength: 8, maxLength: 8 }),
		});
		fc.assert(
			fc.property(scatteredArb, producedWorkflowsArb, ({ calls, slots }, producedWorkflows) => {
				const tree = () => makeAgentNode([], [makeAgentNode([]), makeAgentNode([])]);
				const scattered = [makeMessage(tree()), makeMessage(tree())];
				const nodes = agentNodes(scattered);
				calls.forEach((call, index) => {
					nodes[slots[index] % nodes.length].toolCalls.push({ ...call, completedAt: at(index) });
				});
				const input = { producedWorkflows, dismissedKeys: [] };

				expect(findAutomationOfferCandidate({ ...input, messages: scattered })).toEqual(
					findAutomationOfferCandidate({ ...input, messages: messagesWith(calls) }),
				);
			}),
			{ numRuns: 300 },
		);
	});

	it('only offers a produced workflow that is not archived and not dismissed', () => {
		fc.assert(
			fc.property(inputArb, (input) => {
				const candidate = findAutomationOfferCandidate(input);
				if (!candidate) return;
				const produced = input.producedWorkflows.find((entry) => entry.id === candidate.workflowId);
				expect(produced).toBeDefined();
				expect(produced?.archived).toBe(false);
				expect(candidate.name).toBe(produced?.name);
				expect(input.dismissedKeys).not.toContain(automationOfferKey(candidate.workflowId));
			}),
			{ numRuns: 300 },
		);
	});

	it('offers a workflow for some generated threads', () => {
		// Guards the properties above against generators that never produce a candidate.
		const results = fc
			.sample(inputArb, { numRuns: 300, seed: 42 })
			.map(findAutomationOfferCandidate);

		expect(results.filter(Boolean).length).toBeGreaterThan(45);
	});
});
