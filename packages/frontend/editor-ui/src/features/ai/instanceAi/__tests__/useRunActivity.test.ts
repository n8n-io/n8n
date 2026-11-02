import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';

import { formatRunActivity, useRunActivity } from '../composables/useRunActivity';

function call(toolName: string, args: Record<string, unknown> = {}): InstanceAiToolCallState {
	return { toolCallId: toolName, toolName, args, isLoading: true };
}

function agent(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'root',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function message(tree: InstanceAiAgentNode, isStreaming = true): InstanceAiMessage {
	return {
		id: 'm-1',
		role: 'assistant',
		createdAt: '',
		content: '',
		reasoning: '',
		isStreaming,
		agentTree: tree,
	};
}

describe('useRunActivity', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('names the running tool of the orchestrator, with its details', () => {
		const activity = useRunActivity()([
			message(agent({ toolCalls: [call('search_nodes', { queries: ['gmail', 'slack'] })] })),
		]);

		expect(activity).toEqual({ label: 'Searching for gmail, slack' });
	});

	it('names an active sub-agent and its running tool', () => {
		const child = agent({
			agentId: 'child',
			role: 'workflow-builder',
			kind: 'builder',
			toolCalls: [call('search_nodes', { queries: ['http'] })],
		});

		const activity = useRunActivity()([message(agent({ children: [child] }))]);

		expect(activity?.detail).toBe('Searching for http');
		expect(activity?.label).toBeTruthy();
	});

	it('is thinking when no tool runs', () => {
		expect(useRunActivity()([message(agent())])).toEqual({ label: 'Thinking' });
	});
});

describe('useRunActivity, specific states', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	const done = (
		toolName: string,
		args: Record<string, unknown>,
		result: unknown,
	): InstanceAiToolCallState => ({ ...call(toolName, args), isLoading: false, result });

	function activityOf(toolCalls: InstanceAiToolCallState[]) {
		return useRunActivity()([message(agent({ toolCalls }))]);
	}

	it('adds the newest node, then configures it after 2 seconds', () => {
		const deriveActivity = useRunActivity();
		const write: InstanceAiToolCallState = {
			...call('workspace_write_file'),
			inputProgress: { nodeNames: ['Every Morning', 'Read Invoices'] },
		};
		const messages = [message(agent({ toolCalls: [write] }))];

		expect(deriveActivity(messages, 1000)).toEqual({ label: 'Adding Read Invoices' });
		expect(deriveActivity(messages, 2500)).toEqual({ label: 'Adding Read Invoices' });
		expect(deriveActivity(messages, 3000)).toEqual({ label: 'Configuring Read Invoices' });
	});

	it('rotates between the nodes a blocked build names', () => {
		const deriveActivity = useRunActivity();
		const build = done(
			'workflow_builder_build_workflow',
			{ filePath: 'src/workflows/a.workflow.ts' },
			{
				success: false,
				errors: [
					'[SET_INVALID_ASSIGNMENT] (Set Fields): bad',
					'[MISSING_PARAMETER] (Read Invoices): missing',
					'[OTHER] (Set Fields): again',
					'[GROUP_DROPPED]: too many',
				],
			},
		);
		const messages = [message(agent({ toolCalls: [build] }))];

		expect(deriveActivity(messages, 0)).toEqual({ label: 'Fixing Set Fields' });
		expect(deriveActivity(messages, 3000)).toEqual({ label: 'Fixing Read Invoices' });
		expect(deriveActivity(messages, 6000)).toEqual({ label: 'Fixing Set Fields' });
	});

	it('fixes the workflow when a blocked build names no node', () => {
		const build = done(
			'workflow_builder_build_workflow',
			{},
			{ success: false, errors: ['[GROUP_DROPPED]: too many'] },
		);

		expect(activityOf([build])).toEqual({ label: 'Fixing the workflow' });
	});

	it('rotates between the nodes that failed the test', () => {
		const verify = done(
			'workflow_builder_verify_built_workflow',
			{ workflowId: 'wf-1' },
			{
				success: false,
				status: 'error',
				nodeErrors: [{ nodeName: 'HTTP Request' }, { nodeName: 'Slack' }],
			},
		);
		const deriveActivity = useRunActivity();
		const messages = [message(agent({ toolCalls: [verify] }))];

		expect(deriveActivity(messages, 0)).toEqual({ label: 'Fixing HTTP Request' });
		expect(deriveActivity(messages, 3000)).toEqual({ label: 'Fixing Slack' });
	});

	it.each<[string, Record<string, unknown>, unknown, string]>([
		['search_nodes', { queries: ['gmail'] }, { results: [] }, 'Choosing nodes'],
		['get_node_types', { nodeTypes: ['n8n-nodes-base.gmail'] }, {}, 'Planning the workflow'],
		['load_skill', { name: 'workflow-builder' }, {}, 'Planning the workflow'],
		['workspace_write_file', { path: 'src/workflows/a.workflow.ts' }, {}, 'Reviewing the workflow'],
		[
			'workflow_builder_build_workflow',
			{},
			{ success: true, workflowId: 'wf-1' },
			'Reviewing the workflow',
		],
		['list_credentials', {}, {}, 'Thinking'],
	])('after %s, says what comes next', (toolName, args, result, label) => {
		expect(activityOf([done(toolName, args, result)])).toEqual({ label });
	});

	describe('waiting on the user', () => {
		function pending(
			toolName: string,
			confirmation: Partial<NonNullable<InstanceAiToolCallState['confirmation']>>,
		): InstanceAiToolCallState {
			return {
				...call(toolName),
				confirmation: {
					requestId: `req-${toolName}`,
					severity: 'info',
					message: 'Please confirm',
					...confirmation,
				},
				confirmationStatus: 'pending',
			};
		}

		it.each<[string, Partial<NonNullable<InstanceAiToolCallState['confirmation']>>, string]>([
			['ask_user', { inputType: 'questions' }, 'Waiting on your answer'],
			['ask_user', { inputType: 'text' }, 'Waiting on your answer'],
			[
				'setup_credentials',
				{ credentialRequests: [], credentialFlow: { stage: 'generic' } },
				'Waiting on credentials',
			],
			['data_tables', { inputType: 'resource-decision' }, 'Waiting on your choice'],
			['workflow_builder_build_workflow', { inputType: 'approval' }, 'Waiting on your approval'],
		])('says what %s waits on', (toolName, confirmation, label) => {
			expect(activityOf([pending(toolName, confirmation)])).toEqual({ label, waiting: true });
		});

		it('waits on a sub-agent that asks', () => {
			const child = agent({
				agentId: 'child',
				toolCalls: [pending('ask_user', { inputType: 'questions' })],
			});

			expect(useRunActivity()([message(agent({ children: [child] }))])).toEqual({
				label: 'Waiting on your answer',
				waiting: true,
			});
		});

		it('ignores answered and expired confirmations', () => {
			const answered = {
				...pending('ask_user', { inputType: 'questions' }),
				confirmationStatus: 'approved' as const,
			};
			const expired = pending('ask_user', { inputType: 'questions', expired: true });

			expect(activityOf([answered]).waiting).toBeUndefined();
			expect(activityOf([expired]).waiting).toBeUndefined();
		});
	});
});

describe('formatRunActivity', () => {
	it('joins the label and the detail like the status bar', () => {
		expect(formatRunActivity({ label: 'Building workflow', detail: 'Searching nodes' })).toBe(
			'Building workflow · Searching nodes',
		);
		expect(formatRunActivity({ label: 'Thinking' })).toBe('Thinking');
	});
});
