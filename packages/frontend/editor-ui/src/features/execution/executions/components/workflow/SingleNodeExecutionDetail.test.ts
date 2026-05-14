import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { ExecutionSummary } from 'n8n-workflow';

import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useExecutionsStore } from '../../executions.store';
import type { SingleNodeExecutionSummaryExtras } from '../../executions.types';
import SingleNodeExecutionDetail from './SingleNodeExecutionDetail.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push,
		currentRoute: { value: { query: {} } },
	}),
	useRoute: () => ({ params: {}, query: {}, name: '', path: '' }),
	RouterLink: {
		props: ['to'],
		template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
	},
}));

// JsonEditor pulls in CodeMirror — stub it to a simple <pre> so we can assert
// the JSON string it would render without instantiating the editor in tests.
// Vue hoists `data-test-id` from the parent onto the root of the stub, so the
// test queries rely on the per-pane test-ids the component sets directly.
vi.mock('@/features/shared/editors/components/JsonEditor/JsonEditor.vue', () => ({
	default: {
		props: ['modelValue', 'isReadOnly', 'fillParent'],
		template: '<pre class="stubbed-json-editor">{{ modelValue }}</pre>',
	},
}));

const baseExecution = {
	id: 'exec-1',
	workflowId: 'wf-hub',
	mode: 'single-node',
	status: 'success',
	createdAt: new Date().toISOString(),
	startedAt: new Date().toISOString(),
	stoppedAt: new Date().toISOString(),
	finished: true,
	caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c' },
	actionDisplayName: 'Slack — Post Message',
	credentialId: 'cred-1',
} as unknown as ExecutionSummary & SingleNodeExecutionSummaryExtras & { credentialId?: string };

const runData = {
	Action: [
		{
			data: { main: [[{ json: { ok: true, ts: '1708' } }]] },
			source: [{ previousNode: 'Trigger' }],
			executionStatus: 'success' as const,
			executionIndex: 0,
			startTime: 0,
			executionTime: 1200,
		},
	],
};

const workflowNodes = [
	{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', parameters: { notice: '' } },
	{
		name: 'Action',
		type: 'n8n-nodes-base.slack',
		parameters: {
			authentication: 'oAuth2',
			resource: 'message',
			operation: 'post',
			text: 'Hello world',
		},
	},
];

describe('SingleNodeExecutionDetail', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		push.mockClear();

		// Default: the sibling rail's fetch returns nothing (rail still renders shell).
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.fetchSessionExecutions.mockResolvedValue([]);
	});

	it('renders the action display name as the title', () => {
		const { getByText } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		expect(getByText('Slack — Post Message')).toBeVisible();
	});

	it('renders the caller bar with chip + session chip', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = ((id: string) =>
			id === 'cred-1' ? { id: 'cred-1', name: 'Slack-Prod' } : undefined) as never;

		const { getByText, getByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		expect(getByText('MCP')).toBeVisible();
		expect(getByTestId('executions-session-chip').textContent).toContain('a3f24c');
	});

	it('renders the credential link when credentialId resolves', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = ((id: string) =>
			id === 'cred-1' ? { id: 'cred-1', name: 'Slack-Prod' } : undefined) as never;

		const { getByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		const link = getByTestId('single-node-execution-credential');
		expect(link.textContent).toContain('Slack-Prod');
	});

	it('renders deleted-state fallback when credentialId no longer resolves', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = (() => undefined) as never;

		const { getByText } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: { ...baseExecution, credentialId: 'cred-missing' },
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		expect(getByText(/not found/i)).toBeVisible();
	});

	it('does not render the rail when no sessionId', () => {
		const noSession = {
			...baseExecution,
			caller: { kind: 'sdk', name: '@n8n/sdk' },
		} as unknown as ExecutionSummary & SingleNodeExecutionSummaryExtras & { credentialId?: string };
		const { queryByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: noSession,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		expect(queryByTestId('single-node-execution-rail')).toBeNull();
	});

	it('renders the action node parameters as the input (not the trigger source metadata)', () => {
		const { getByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});

		const editor = getByTestId('single-node-execution-input-json');
		expect(editor).not.toBeNull();
		const text = editor.textContent ?? '';
		// Parameters from the Action node show up.
		expect(text).toContain('"resource": "message"');
		expect(text).toContain('"operation": "post"');
		expect(text).toContain('"text": "Hello world"');
		// And the trigger source metadata leaks through nowhere.
		expect(text).not.toContain('previousNode');
		expect(text).not.toContain('previousNodeOutput');
	});

	it('renders the run output items in the output pane', () => {
		const { getByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'Action',
				workflowNodes,
			},
		});
		const editor = getByTestId('single-node-execution-output-json');
		expect(editor.textContent).toContain('"ok": true');
		expect(editor.textContent).toContain('"ts": "1708"');
	});

	it('falls back to the last non-trigger node when no node matches executedNodeName', () => {
		const { getByTestId } = renderComponent(SingleNodeExecutionDetail, {
			props: {
				execution: baseExecution,
				runData,
				executedNodeName: 'DoesNotMatchByName',
				workflowNodes,
			},
		});
		const inputPane = getByTestId('single-node-execution-input');
		expect(inputPane.textContent).toContain('"resource": "message"');
	});
});
