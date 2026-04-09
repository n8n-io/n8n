import { defineStore } from 'pinia';
import { ref, computed, triggerRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { ResponseError } from '@n8n/rest-api-client';
import {
	instanceAiEventSchema,
	isSafeObjectKey,
	UNLIMITED_CREDITS,
	type InstanceAiConfirmation,
	type InstanceAiConfirmResponse,
} from '@n8n/api-types';
import {
	ensureThread,
	postMessage,
	postCancel,
	postCancelTask,
	postConfirmation,
	getInstanceAiCredits,
} from './instanceAi.api';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import {
	fetchThreads as fetchThreadsApi,
	fetchThreadMessages as fetchThreadMessagesApi,
	fetchThreadStatus as fetchThreadStatusApi,
	deleteThread as deleteThreadApi,
	renameThread as renameThreadApi,
	updateThreadMetadata as updateThreadMetadataApi,
} from './instanceAi.memory.api';
import { handleEvent as reduceEvent, rebuildRunStateFromTree } from './instanceAi.reducer';
import { useResourceRegistry } from './useResourceRegistry';
import { useResponseFeedback } from './useResponseFeedback';
import { NEW_CONVERSATION_TITLE } from './constants';
import type {
	InstanceAiAttachment,
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiThreadSummary,
	InstanceAiSSEConnectionState,
	TaskList,
} from '@n8n/api-types';

export interface PendingConfirmationItem {
	toolCall: InstanceAiToolCallState & { confirmation: InstanceAiConfirmation };
	agentNode: InstanceAiAgentNode;
	messageId: string;
}

/** Walk an agent tree, collecting tool calls that have an active (pending) confirmation. */
function collectPendingConfirmations(
	node: InstanceAiAgentNode,
	messageId: string,
	resolved: Map<string, 'approved' | 'denied' | 'deferred'>,
	out: PendingConfirmationItem[],
): void {
	for (const tc of node.toolCalls) {
		if (
			tc.confirmation &&
			tc.isLoading &&
			tc.confirmationStatus !== 'approved' &&
			tc.confirmationStatus !== 'denied' &&
			!resolved.has(tc.confirmation.requestId) &&
			// Plan review renders inline in the timeline, not in the confirmation panel
			tc.confirmation.inputType !== 'plan-review'
		) {
			out.push({
				toolCall: tc as InstanceAiToolCallState & { confirmation: InstanceAiConfirmation },
				agentNode: node,
				messageId,
			});
		}
	}
	for (const child of node.children) {
		collectPendingConfirmations(child, messageId, resolved, out);
	}
}

/** Find a tool call in an agent tree by its confirmation requestId. */
function findToolCallInTree(
	node: InstanceAiAgentNode,
	requestId: string,
): InstanceAiToolCallState | undefined {
	for (const tc of node.toolCalls) {
		if (tc.confirmation?.requestId === requestId) return tc;
	}
	for (const child of node.children) {
		const found = findToolCallInTree(child, requestId);
		if (found) return found;
	}
	return undefined;
}

function findLatestTasksFromMessages(messages: InstanceAiMessage[]): TaskList | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const tasks = messages[i].agentTree?.tasks;
		if (tasks) return tasks;
	}

	return null;
}

// Module-level EventSource reference — not in reactive state (not serializable,
// not needed for rendering, wrapping in a reactive proxy causes issues).
let eventSource: EventSource | null = null;

// Module-level reducer state storage — kept outside Vue reactivity.
import type { AgentRunState } from '@n8n/api-types';
let runStateByGroupId: Record<string, AgentRunState> = {};
let groupIdByRunId: Record<string, string> = {};

// SSE connection generation — incremented on every connectSSE() call.
// Stale EventSource instances from previous threads discard events.
let sseGeneration = 0;

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const persistedThreadIds = new Set<string>();

	// --- State ---
	const currentThreadId = ref<string>(uuidv4());
	const threads = ref<InstanceAiThreadSummary[]>([]);
	const sseState = ref<InstanceAiSSEConnectionState>('disconnected');
	const lastEventIdByThread = ref<Record<string, number>>({});
	const activeRunId = ref<string | null>(null);
	const messages = ref<InstanceAiMessage[]>([]);

	// ── DEV-ONLY: mock message fixtures ──
	const MOCK_MESSAGES: InstanceAiMessage[] = [
		// 1. User message
		{
			id: 'mock-user-1',
			role: 'user',
			createdAt: new Date().toISOString(),
			content: 'Build me a workflow that fetches GitHub issues and stores them in a data table',
			reasoning: '',
			isStreaming: false,
		},
		// 2. Full agent tree (tasks, delegate, children, tool calls)
		{
			id: 'mock-assistant-1',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: 'I should break this into sub-tasks.',
			isStreaming: false,
			agentTree: {
				agentId: 'root-agent',
				role: 'orchestrator',
				status: 'completed',
				textContent: "I'll create a GitHub issues workflow and set up the data table for you.",
				reasoning: 'Need to delegate to builder and data-table agents.',
				toolCalls: [
					{
						toolCallId: 'tc-tasks-1',
						toolName: 'update-tasks',
						args: {},
						isLoading: false,
						renderHint: 'tasks' as const,
					},
					{
						toolCallId: 'tc-delegate-1',
						toolName: 'delegate',
						renderHint: 'delegate' as const,
						args: {
							role: 'workflow-builder',
							tools: ['search-nodes', 'build-workflow'],
							briefing: 'Build a workflow that fetches GitHub issues.',
						},
						result: { success: true },
						isLoading: false,
					},
					{
						toolCallId: 'tc-delegate-2',
						toolName: 'delegate',
						renderHint: 'delegate' as const,
						args: {
							role: 'data-table-manager',
							tools: ['list-data-tables', 'create-data-table', 'add-data-table-column'],
							briefing: 'Create a data table to store GitHub issues.',
						},
						isLoading: true,
					},
					{
						toolCallId: 'tc-builder-1',
						toolName: 'build-workflow',
						args: {},
						isLoading: false,
						renderHint: 'builder' as const,
					},
					{
						toolCallId: 'tc-search-1',
						toolName: 'web-search',
						args: { query: 'GitHub API list issues endpoint' },
						result: { summary: 'Found docs.' },
						isLoading: false,
					},
					{
						toolCallId: 'tc-fetch-1',
						toolName: 'fetch-url',
						args: { url: 'https://api.github.com/repos/n8n-io/n8n/issues' },
						error: 'Request timed out after 30s',
						isLoading: false,
					},
					{
						toolCallId: 'tc-loading-1',
						toolName: 'get-node-type-definition',
						args: { nodeType: 'n8n-nodes-base.github' },
						isLoading: true,
					},
				],
				tasks: {
					tasks: [
						{ id: 't1', description: 'Build GitHub issues workflow', status: 'done' as const },
						{
							id: 't2',
							description: 'Create data table for issues',
							status: 'in_progress' as const,
						},
						{ id: 't3', description: 'Test the workflow execution', status: 'todo' as const },
					],
				},
				children: [
					{
						agentId: 'child-builder-1',
						role: 'workflow-builder',
						kind: 'builder' as const,
						status: 'completed',
						subtitle: 'Building GitHub issues workflow',
						textContent: 'Built the workflow.',
						reasoning: '',
						result: 'Workflow "Fetch GitHub Issues" created.',
						toolCalls: [
							{
								toolCallId: 'child-tc-1',
								toolName: 'search-nodes',
								args: { query: 'github' },
								result: { nodes: ['GitHub'] },
								isLoading: false,
							},
							{
								toolCallId: 'child-tc-2',
								toolName: 'build-workflow',
								args: { name: 'Fetch GitHub Issues' },
								result: {
									success: true,
									workflowId: 'wf-123',
									workflowName: 'Fetch GitHub Issues',
								},
								isLoading: false,
							},
						],
						children: [],
						timeline: [
							{ type: 'tool-call' as const, toolCallId: 'child-tc-1' },
							{ type: 'text' as const, content: 'Found GitHub node. Building workflow.' },
							{ type: 'tool-call' as const, toolCallId: 'child-tc-2' },
						],
					},
					{
						agentId: 'child-dt-1',
						role: 'data-table-manager',
						kind: 'data-table' as const,
						status: 'active',
						subtitle: 'Setting up issues data table',
						textContent: '',
						reasoning: '',
						toolCalls: [
							{
								toolCallId: 'child-dt-tc-1',
								toolName: 'list-data-tables',
								args: {},
								result: { tables: [] },
								isLoading: false,
							},
							{
								toolCallId: 'child-dt-tc-2',
								toolName: 'create-data-table',
								args: { name: 'GitHub Issues', columns: ['title', 'state', 'author'] },
								isLoading: true,
							},
						],
						children: [],
						timeline: [
							{ type: 'tool-call' as const, toolCallId: 'child-dt-tc-1' },
							{ type: 'text' as const, content: 'No existing tables. Creating new one.' },
							{ type: 'tool-call' as const, toolCallId: 'child-dt-tc-2' },
						],
					},
					{
						agentId: 'child-err-1',
						role: 'researcher',
						kind: 'researcher' as const,
						status: 'error',
						subtitle: 'Researching GitHub API rate limits',
						textContent: '',
						reasoning: '',
						error: 'Failed to fetch docs: connection reset',
						toolCalls: [
							{
								toolCallId: 'child-err-tc-1',
								toolName: 'web-search',
								args: { query: 'GitHub API rate limits' },
								result: { summary: '5000 req/hr.' },
								isLoading: false,
							},
							{
								toolCallId: 'child-err-tc-2',
								toolName: 'fetch-url',
								args: { url: 'https://docs.github.com/en/rest/rate-limit' },
								error: 'Connection reset',
								isLoading: false,
							},
						],
						children: [],
						timeline: [
							{ type: 'tool-call' as const, toolCallId: 'child-err-tc-1' },
							{ type: 'tool-call' as const, toolCallId: 'child-err-tc-2' },
						],
					},
				],
				timeline: [
					{ type: 'tool-call' as const, toolCallId: 'tc-tasks-1' },
					{
						type: 'text' as const,
						content: "I'll create the workflow and data table. Delegating tasks.",
					},
					{ type: 'tool-call' as const, toolCallId: 'tc-delegate-1' },
					{ type: 'tool-call' as const, toolCallId: 'tc-delegate-2' },
					{ type: 'tool-call' as const, toolCallId: 'tc-builder-1' },
					{ type: 'child' as const, agentId: 'child-builder-1' },
					{ type: 'child' as const, agentId: 'child-dt-1' },
					{ type: 'child' as const, agentId: 'child-err-1' },
					{ type: 'tool-call' as const, toolCallId: 'tc-search-1' },
					{ type: 'tool-call' as const, toolCallId: 'tc-fetch-1' },
					{ type: 'tool-call' as const, toolCallId: 'tc-loading-1' },
				],
			},
		},
		// 3. Plan review (renders inline via PlanReviewPanel)
		{
			id: 'mock-assistant-2',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: 'root-agent-2',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-plan-1',
						toolName: 'present-plan',
						isLoading: true,
						args: {
							tasks: [
								{
									id: 'p1',
									title: 'Create HTTP Request node',
									spec: 'Fetch issues from GitHub API using the REST endpoint.',
									kind: 'build-workflow',
									deps: [],
								},
								{
									id: 'p2',
									title: 'Add filter for open issues',
									spec: 'Only process issues with state=open.',
									kind: 'build-workflow',
									deps: ['p1'],
								},
								{
									id: 'p3',
									title: 'Create data table',
									spec: 'Store results in a data table with columns: title, state, author, url.',
									kind: 'manage-data-tables',
									deps: ['p1'],
								},
							],
						},
						confirmation: {
							requestId: 'confirm-plan-1',
							severity: 'info' as const,
							message: 'Review plan.',
							inputType: 'plan-review' as const,
						},
					},
				],
				children: [],
				timeline: [
					{ type: 'text' as const, content: "Here's my plan:" },
					{ type: 'tool-call' as const, toolCallId: 'tc-plan-1' },
				],
			},
		},
		// 4. Pending questions (shows in ConfirmationPanel as interactive wizard)
		{
			id: 'mock-assistant-4',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: 'root-agent-4',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-pending-q-1',
						toolName: 'ask-questions',
						isLoading: true,
						args: {
							questions: [
								{
									id: 'q1',
									question: 'Which GitHub authentication method do you want to use?',
									type: 'single',
									options: ['Personal Access Token', 'OAuth App', 'GitHub App'],
								},
								{
									id: 'q2',
									question: 'Which repositories should I watch?',
									type: 'multi',
									options: ['n8n-io/n8n', 'n8n-io/n8n-docs', 'n8n-io/n8n-desktop-app'],
								},
								{ id: 'q3', question: 'Any additional filters for the issues?', type: 'text' },
							],
						},
						confirmation: {
							requestId: 'confirm-q-pending-1',
							severity: 'info' as const,
							message: 'I need some info before proceeding.',
							inputType: 'questions' as const,
							introMessage: 'Before I start building, I have a few questions:',
							questions: [
								{
									id: 'q1',
									question: 'Which GitHub authentication method do you want to use?',
									type: 'single' as const,
									options: ['Personal Access Token', 'OAuth App', 'GitHub App'],
								},
								{
									id: 'q2',
									question: 'Which repositories should I watch?',
									type: 'multi' as const,
									options: ['n8n-io/n8n', 'n8n-io/n8n-docs', 'n8n-io/n8n-desktop-app'],
								},
								{
									id: 'q3',
									question: 'Any additional filters for the issues?',
									type: 'text' as const,
								},
							],
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-pending-q-1' }],
			},
		},
		// 5. Answered questions (read-only)
		{
			id: 'mock-assistant-5',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: "Great, I'll use the PAT and create the workflow in your default project.",
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: 'root-agent-5',
				role: 'orchestrator',
				status: 'completed',
				textContent: "Great, I'll use the PAT and create the workflow in your default project.",
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-answered-q-1',
						toolName: 'ask-questions',
						isLoading: false,
						args: {
							questions: [
								{
									id: 'q1',
									question: 'Which GitHub authentication method?',
									type: 'single',
									options: ['Personal Access Token', 'OAuth App', 'GitHub App'],
								},
								{
									id: 'q2',
									question: 'Which project should I create the workflow in?',
									type: 'text',
								},
							],
						},
						result: {
							answered: true,
							answers: [
								{ questionId: 'q1', selectedOptions: ['Personal Access Token'] },
								{ questionId: 'q2', customText: 'Default project', selectedOptions: [] },
							],
						},
						confirmation: {
							requestId: 'confirm-q-done-1',
							severity: 'info' as const,
							message: 'I need some info.',
							inputType: 'questions' as const,
							questions: [
								{
									id: 'q1',
									question: 'Which GitHub authentication method?',
									type: 'single' as const,
									options: ['Personal Access Token', 'OAuth App', 'GitHub App'],
								},
								{
									id: 'q2',
									question: 'Which project should I create the workflow in?',
									type: 'text' as const,
								},
							],
						},
						confirmationStatus: 'approved',
					},
				],
				children: [],
				timeline: [
					{ type: 'tool-call' as const, toolCallId: 'tc-answered-q-1' },
					{
						type: 'text' as const,
						content: "Great, I'll use the PAT and create the workflow in your default project.",
					},
				],
			},
		},
		// 6. Simple text-only response
		{
			id: 'mock-assistant-6',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content:
				'Everything is set up! Your workflow fetches GitHub issues every hour and stores them in the **GitHub Issues** data table.',
			reasoning: '',
			isStreaming: false,
		},
		// 7. Error-state message
		{
			id: 'mock-assistant-7',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: 'root-agent-7',
				role: 'orchestrator',
				status: 'error',
				textContent: '',
				reasoning: '',
				error: 'The model returned an unexpected response. Please try again.',
				errorDetails: {
					statusCode: 500,
					provider: 'Anthropic',
					technicalDetails: '{"error":{"type":"overloaded_error","message":"Overloaded"}}',
				},
				toolCalls: [],
				children: [],
				timeline: [],
			},
		},
		// 8. Confirmation panel — generic approvals (triggers "Approve All") + domain access (separate group)
		{
			id: 'mock-assistant-8',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: 'root-agent-8',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					// Generic approval #1
					{
						toolCallId: 'tc-approve-1',
						toolName: 'publish-workflow',
						isLoading: true,
						args: { workflowId: 'wf-123', name: 'Fetch GitHub Issues' },
						confirmation: {
							requestId: 'confirm-approve-1',
							severity: 'warning' as const,
							message: 'Publish workflow "Fetch GitHub Issues" to production?',
						},
					},
					// Generic approval #2 (2+ generics in same agent → "Approve All" header)
					{
						toolCallId: 'tc-approve-2',
						toolName: 'delete-workflow',
						isLoading: true,
						args: { workflowId: 'wf-old-456' },
						confirmation: {
							requestId: 'confirm-approve-2',
							severity: 'destructive' as const,
							message: 'Delete workflow "Old Backup Flow"? This cannot be undone.',
						},
					},
				],
				children: [
					// Domain access in a child agent (separate agentId → own approval-wrapped group)
					{
						agentId: 'child-domain-agent',
						role: 'researcher',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [
							{
								toolCallId: 'tc-domain-1',
								toolName: 'fetch-url',
								isLoading: true,
								args: { url: 'https://api.github.com/repos/n8n-io/n8n/issues' },
								confirmation: {
									requestId: 'confirm-domain-1',
									severity: 'info' as const,
									message: 'Allow access to api.github.com?',
									domainAccess: {
										url: 'https://api.github.com/repos/n8n-io/n8n/issues',
										host: 'api.github.com',
									},
								},
							},
						],
						children: [],
						timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-domain-1' }],
					},
				],
				timeline: [
					{ type: 'tool-call' as const, toolCallId: 'tc-approve-1' },
					{ type: 'tool-call' as const, toolCallId: 'tc-approve-2' },
					{ type: 'child' as const, agentId: 'child-domain-agent' },
				],
			},
		},
		// 9. Confirmation panel — text input (ask-user)
		{
			id: 'mock-assistant-9',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: 'root-agent-9',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-text-input-1',
						toolName: 'ask-user',
						isLoading: true,
						args: {},
						confirmation: {
							requestId: 'confirm-text-1',
							severity: 'info' as const,
							message: 'What Slack channel should notifications be sent to?',
							inputType: 'text' as const,
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-text-input-1' }],
			},
		},
		// 10. Confirmation panel — gateway resource decision
		{
			id: 'mock-assistant-10',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: 'root-agent-10',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-gateway-1',
						toolName: 'filesystem-read',
						isLoading: true,
						args: { path: '/Users/project/config.json' },
						confirmation: {
							requestId: 'confirm-gateway-1',
							severity: 'warning' as const,
							message: 'Allow filesystem access?',
							inputType: 'resource-decision' as const,
							resourceDecision: {
								toolGroup: 'filesystem',
								resource: 'File Read',
								description: 'Read file: /Users/project/config.json',
								options: ['allowOnce', 'allowForSession', 'alwaysAllow', 'denyOnce', 'alwaysDeny'],
							},
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-gateway-1' }],
			},
		},
		// 11. Confirmation panel — credential setup
		{
			id: 'mock-assistant-11',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: 'root-agent-11',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-cred-setup-1',
						toolName: 'setup-credentials',
						isLoading: true,
						args: {},
						confirmation: {
							requestId: 'confirm-cred-1',
							severity: 'info' as const,
							message: 'Set up credentials for this workflow',
							credentialRequests: [
								{
									credentialType: 'githubApi',
									reason: 'Required to authenticate with the GitHub API and fetch issues',
									existingCredentials: [{ id: 'cred-gh-1', name: 'My GitHub PAT' }],
									suggestedName: 'GitHub Token',
								},
								{
									credentialType: 'slackApi',
									reason: 'Needed to post issue summaries to a Slack channel',
									existingCredentials: [],
									suggestedName: 'Slack Bot Token',
								},
							],
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-cred-setup-1' }],
			},
		},
		// 12. Confirmation panel — workflow setup (setupRequests)
		{
			id: 'mock-assistant-12',
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: true,
			agentTree: {
				agentId: 'root-agent-12',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-wf-setup-1',
						toolName: 'setup-workflow',
						isLoading: true,
						args: {},
						confirmation: {
							requestId: 'confirm-wf-setup-1',
							severity: 'info' as const,
							message: 'Configure the workflow nodes before activation',
							workflowId: 'wf-setup-123',
							setupRequests: [
								{
									node: {
										name: 'GitHub Trigger',
										type: 'n8n-nodes-base.githubTrigger',
										typeVersion: 1,
										parameters: { owner: 'n8n-io', repository: 'n8n', events: ['issues'] },
										position: [250, 300] as [number, number],
										id: 'node-gh-trigger',
									},
									credentialType: 'githubApi',
									existingCredentials: [{ id: 'cred-gh-1', name: 'My GitHub PAT' }],
									isTrigger: true,
									isFirstTrigger: true,
									isTestable: true,
								},
								{
									node: {
										name: 'Slack',
										type: 'n8n-nodes-base.slack',
										typeVersion: 2,
										parameters: { channel: '#notifications', text: 'New issue: {{ $json.title }}' },
										position: [500, 300] as [number, number],
										id: 'node-slack',
									},
									credentialType: 'slackApi',
									existingCredentials: [],
									isTrigger: false,
								},
							],
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call' as const, toolCallId: 'tc-wf-setup-1' }],
			},
		},
	];
	const latestTasks = ref<TaskList | null>(null);
	const debugEvents = ref<Array<{ timestamp: string; event: InstanceAiEvent }>>([]);
	const debugMode = ref(false);
	const researchMode = ref(localStorage.getItem('instanceAi.researchMode') === 'true');
	const amendContext = ref<{ agentId: string; role: string } | null>(null);
	// Credits are instance-level state (not per-thread). Re-fetched on mount via fetchCredits(),
	// and updated in real-time via the 'updateInstanceAiCredits' push event.
	// No reset needed on thread switch — login/logout reloads the page.
	const creditsQuota = ref<number | undefined>(undefined);
	const creditsClaimed = ref<number | undefined>(undefined);
	const resolvedConfirmationIds = ref<Map<string, 'approved' | 'denied' | 'deferred'>>(new Map());
	const MAX_DEBUG_EVENTS = 1000;

	// --- Computed ---
	const isStreaming = computed(() => activeRunId.value !== null);
	const hasMessages = computed(() => messages.value.length > 0);
	const isGatewayConnected = computed(() => instanceAiSettingsStore.isGatewayConnected);
	const gatewayDirectory = computed(() => instanceAiSettingsStore.gatewayDirectory);
	const activeDirectory = computed(() => gatewayDirectory.value);

	// Resource registry — maps known resource names to their types & IDs
	const workflowsListStore = useWorkflowsListStore();
	const { registry: resourceRegistry } = useResourceRegistry(
		() => messages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
	);

	// Response feedback — rateability selector + submission
	const { feedbackByResponseId, rateableResponseId, submitFeedback, resetFeedback } =
		useResponseFeedback({ messages, currentThreadId, telemetry });

	/** The latest task list, preferring explicit tasks-update events over tree snapshots. */
	const currentTasks = computed(
		() => latestTasks.value ?? findLatestTasksFromMessages(messages.value),
	);

	/**
	 * Derive a single contextual follow-up suggestion from the last completed
	 * assistant message. Shown as the input placeholder + Tab to autocomplete.
	 */
	const contextualSuggestion = computed((): string | null => {
		if (isStreaming.value) return null;

		// Find last assistant message
		const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
		if (!lastAssistant || lastAssistant.isStreaming) return null;

		const tree = lastAssistant.agentTree;
		if (!tree) return null;

		// Workflow builder completed
		const builderChild = tree.children.find((c) => c.role === 'workflow-builder');
		if (builderChild) {
			return builderChild.status === 'error' || builderChild.status === 'cancelled'
				? 'Try building the workflow again with different settings'
				: 'Add error handling to the workflow';
		}

		// Data table manager completed
		const dataChild = tree.children.find((c) => c.role === 'data-table-manager');
		if (dataChild) {
			return 'Query the data table to show recent entries';
		}

		return null;
	});

	const creditsRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsClaimed.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS
		) {
			return undefined;
		}
		return Math.max(0, creditsQuota.value - creditsClaimed.value);
	});

	const creditsPercentageRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS ||
			creditsRemaining.value === undefined
		) {
			return undefined;
		}
		if (creditsQuota.value === 0) return 0;
		return (creditsRemaining.value / creditsQuota.value) * 100;
	});

	const isLowCredits = computed(() => {
		return creditsPercentageRemaining.value !== undefined && creditsPercentageRemaining.value <= 10;
	});

	// --- Credits push listener ---

	let removeCreditsPushListener: (() => void) | null = null;

	function startCreditsPushListener(): void {
		if (removeCreditsPushListener) return;
		const pushStore = usePushConnectionStore();
		removeCreditsPushListener = pushStore.addEventListener((message) => {
			if (message.type !== 'updateInstanceAiCredits') return;
			creditsQuota.value = message.data.creditsQuota;
			creditsClaimed.value = message.data.creditsClaimed;
		});
	}

	function stopCreditsPushListener(): void {
		if (removeCreditsPushListener) {
			removeCreditsPushListener();
			removeCreditsPushListener = null;
		}
	}

	async function fetchCredits(): Promise<void> {
		try {
			const result = await getInstanceAiCredits(rootStore.restApiContext);
			creditsQuota.value = result.creditsQuota;
			creditsClaimed.value = result.creditsClaimed;
		} catch {
			// Non-critical — credits display is optional
		}
	}

	/** All pending confirmations across all messages, for the top-level panel. */
	const pendingConfirmations = computed((): PendingConfirmationItem[] => {
		const items: PendingConfirmationItem[] = [];
		for (const msg of messages.value) {
			if (msg.role !== 'assistant' || !msg.agentTree) continue;
			collectPendingConfirmations(msg.agentTree, msg.id, resolvedConfirmationIds.value, items);
		}
		return items;
	});

	function resolveConfirmation(
		requestId: string,
		action: 'approved' | 'denied' | 'deferred',
	): void {
		const next = new Map(resolvedConfirmationIds.value);
		next.set(requestId, action);
		resolvedConfirmationIds.value = next;
	}

	/** Find a tool call by its confirmation requestId across all messages. */
	function findToolCallByRequestId(requestId: string): InstanceAiToolCallState | undefined {
		for (const msg of messages.value) {
			if (!msg.agentTree) continue;
			const found = findToolCallInTree(msg.agentTree, requestId);
			if (found) return found;
		}
		return undefined;
	}

	// --- Event reducer (delegated to pure module) ---

	// --- SSE lifecycle ---

	function onSSEMessage(sseEvent: MessageEvent): void {
		// Track last event ID per thread (for reconnection)
		if (sseEvent.lastEventId) {
			lastEventIdByThread.value[currentThreadId.value] = Number(sseEvent.lastEventId);
		}
		try {
			const parsed = instanceAiEventSchema.safeParse(JSON.parse(String(sseEvent.data)));
			if (!parsed.success) {
				console.warn('[InstanceAI] Invalid SSE event, skipping:', parsed.error.message);
				return;
			}
			// Push to debug event buffer (capped)
			debugEvents.value.push({
				timestamp: new Date().toISOString(),
				event: parsed.data,
			});
			if (debugEvents.value.length > MAX_DEBUG_EVENTS) {
				debugEvents.value.splice(0, debugEvents.value.length - MAX_DEBUG_EVENTS);
			}
			const previousRunId = activeRunId.value;
			activeRunId.value = reduceEvent(
				{
					messages: messages.value,
					activeRunId: activeRunId.value,
					runStateByGroupId,
					groupIdByRunId,
				},
				parsed.data,
			);
			if (parsed.data.type === 'tasks-update') {
				latestTasks.value = parsed.data.payload.tasks;
			}
			if (parsed.data.type === 'thread-title-updated') {
				const thread = threads.value.find((t) => t.id === currentThreadId.value);
				if (thread) {
					thread.title = parsed.data.payload.title;
				}
			}
			// Force Vue reactivity when streaming state changes (run-start can
			// re-activate a completed message for auto-follow-up runs, run-finish
			// marks it done). In-place mutation of message properties may not
			// reliably trigger deep watchers in all scenarios (e.g. background tabs).
			if (parsed.data.type === 'run-start' || parsed.data.type === 'run-finish') {
				triggerRef(messages);
			}
			// When a run finishes, refresh thread list to pick up Mastra-generated titles
			if (previousRunId && activeRunId.value === null) {
				void loadThreads();
			}
		} catch {
			// Malformed JSON — skip
		}
	}

	/**
	 * Handle run-sync control frames — full state snapshot from the backend.
	 * Replaces the agent tree AND rebuilds the group-level run state so
	 * subsequent live events have state to reduce into. Also restores the
	 * runId → groupId mapping so late events from any run in the group route
	 * to the correct message.
	 */
	function onRunSync(sseEvent: MessageEvent): void {
		try {
			const data = JSON.parse(String(sseEvent.data)) as {
				runId: string;
				messageGroupId?: string;
				runIds?: string[];
				agentTree: InstanceAiAgentNode;
				status: string;
			};

			const groupId = data.messageGroupId ?? data.runId;
			if (!isSafeObjectKey(data.runId) || !isSafeObjectKey(groupId)) return;
			const rebuiltRunState = rebuildRunStateFromTree(data.agentTree);
			if (!rebuiltRunState) return;

			// Find the message to update — by messageGroupId first, then runId
			let msg: InstanceAiMessage | undefined;
			if (data.messageGroupId) {
				msg = messages.value.find(
					(m) => m.messageGroupId === data.messageGroupId && m.role === 'assistant',
				);
			}
			if (!msg) {
				msg = messages.value.find((m) => m.runId === data.runId);
			}

			if (!msg) {
				messages.value.push({
					id: groupId,
					runId: data.runId,
					messageGroupId: groupId,
					runIds: data.runIds,
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: data.agentTree.textContent,
					reasoning: data.agentTree.reasoning,
					isStreaming: false,
					agentTree: data.agentTree,
				});
				msg = messages.value[messages.value.length - 1];
			}

			msg.agentTree = data.agentTree;
			msg.runId = data.runId;
			msg.messageGroupId = groupId;
			msg.runIds = data.runIds;
			msg.content = data.agentTree.textContent;
			msg.reasoning = data.agentTree.reasoning;
			latestTasks.value = findLatestTasksFromMessages(messages.value);
			const isOrchestratorLive = data.status === 'active' || data.status === 'suspended';
			// For background-only groups, the orchestrator already finished.
			// Set isStreaming = false so InstanceAiMessage.vue's hasActiveBackgroundTasks
			// computed correctly detects active children and shows the indicator.
			msg.isStreaming = isOrchestratorLive;
			// Only the active/suspended orchestrator run should claim activeRunId.
			// Background-only groups update their message but don't override the
			// global active run, which controls input state and cancel buttons.
			if (isOrchestratorLive) {
				activeRunId.value = data.runId;
			}

			// Rebuild normalized run state keyed by groupId
			runStateByGroupId[groupId] = rebuiltRunState;

			// Restore runId → groupId mappings for ALL runs in the group.
			// This ensures late events from older follow-up runs still route
			// to this message after reconnect.
			if (data.runIds) {
				for (const rid of data.runIds) {
					if (!isSafeObjectKey(rid)) continue;
					groupIdByRunId[rid] = groupId;
				}
			}
			// Always register the current runId
			groupIdByRunId[data.runId] = groupId;
		} catch {
			// Malformed run-sync — skip
		}
	}

	function connectSSE(threadId?: string): void {
		const tid = threadId ?? currentThreadId.value;
		if (eventSource) {
			closeSSE();
		}
		sseState.value = 'connecting';

		// Increment generation — stale EventSource handlers will check this
		const gen = ++sseGeneration;
		const capturedThreadId = tid;

		const lastEventId = lastEventIdByThread.value[tid];
		const baseUrl = rootStore.restApiContext.baseUrl;
		const url =
			lastEventId !== null && lastEventId !== undefined
				? `${baseUrl}/instance-ai/events/${tid}?lastEventId=${String(lastEventId)}`
				: `${baseUrl}/instance-ai/events/${tid}`;

		eventSource = new EventSource(url, { withCredentials: true });

		eventSource.onopen = () => {
			if (gen !== sseGeneration) return;
			sseState.value = 'connected';
		};

		eventSource.onmessage = (ev: MessageEvent) => {
			// Guard: discard events from stale connections or wrong threads
			if (gen !== sseGeneration || capturedThreadId !== currentThreadId.value) {
				return;
			}
			onSSEMessage(ev);
		};

		// Listen for run-sync control frames (named SSE event, no id: field)
		eventSource.addEventListener('run-sync', (ev: MessageEvent) => {
			if (gen !== sseGeneration || capturedThreadId !== currentThreadId.value) return;
			onRunSync(ev);
		});

		eventSource.onerror = () => {
			if (gen !== sseGeneration) return;
			// EventSource auto-reconnects. Mark as reconnecting if not already closed.
			if (eventSource?.readyState === EventSource.CONNECTING) {
				sseState.value = 'reconnecting';
			} else if (eventSource?.readyState === EventSource.CLOSED) {
				sseState.value = 'disconnected';
				eventSource = null;
			}
		};
	}

	function closeSSE(): void {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		sseState.value = 'disconnected';
	}

	function switchThread(threadId: string): void {
		// 1. Close current SSE connection
		closeSSE();
		// 2. Clear store state
		messages.value = [];
		latestTasks.value = null;
		activeRunId.value = null;
		debugEvents.value = [];
		resetFeedback();
		resolvedConfirmationIds.value = new Map();
		runStateByGroupId = {};
		groupIdByRunId = {};
		// 3. Switch thread
		currentThreadId.value = threadId;
		// 4. Load rich historical messages first, then connect SSE after.
		//    loadHistoricalMessages sets the SSE cursor (nextEventId) so SSE
		//    only receives events that arrived AFTER the historical snapshot.
		delete lastEventIdByThread.value[threadId];
		void loadHistoricalMessages(threadId).then(() => {
			void loadThreadStatus(threadId);
			connectSSE(threadId);
		});
	}

	// --- Actions ---

	function newThread(): string {
		const newThreadId = uuidv4();
		closeSSE();
		messages.value = [];
		latestTasks.value = null;
		activeRunId.value = null;
		debugEvents.value = [];
		resetFeedback();
		resolvedConfirmationIds.value = new Map();
		runStateByGroupId = {};
		groupIdByRunId = {};
		currentThreadId.value = newThreadId;

		threads.value.unshift({
			id: newThreadId,
			title: NEW_CONVERSATION_TITLE,
			createdAt: new Date().toISOString(),
		});

		connectSSE(newThreadId);
		return newThreadId;
	}

	async function deleteThread(
		threadId: string,
	): Promise<{ currentThreadId: string; wasActive: boolean }> {
		const wasActive = threadId === currentThreadId.value;

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			try {
				await deleteThreadApi(rootStore.restApiContext, threadId);
				persistedThreadIds.delete(threadId);
			} catch {
				toast.showError(new Error('Failed to delete thread. Try again.'), 'Delete failed');
				return { currentThreadId: currentThreadId.value, wasActive };
			}
		}

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);

		// Clean up event cursor
		delete lastEventIdByThread.value[threadId];

		if (wasActive) {
			if (threads.value.length > 0) {
				// Switch to first remaining thread
				switchThread(threads.value[0].id);
			} else {
				// No threads left — create a new one
				const freshId = uuidv4();
				closeSSE();
				messages.value = [];
				latestTasks.value = null;
				activeRunId.value = null;
				debugEvents.value = [];
				resetFeedback();
				resolvedConfirmationIds.value = new Map();
				runStateByGroupId = {};
				groupIdByRunId = {};
				currentThreadId.value = freshId;
				threads.value.push({
					id: freshId,
					title: NEW_CONVERSATION_TITLE,
					createdAt: new Date().toISOString(),
				});
				connectSSE(freshId);
			}
		}

		return { currentThreadId: currentThreadId.value, wasActive };
	}

	async function loadThreads(): Promise<void> {
		try {
			const result = await fetchThreadsApi(rootStore.restApiContext);
			for (const thread of result.threads) {
				persistedThreadIds.add(thread.id);
			}
			// Merge server threads into local list, preserving any local-only threads
			// (e.g. a freshly created thread that hasn't been persisted yet)
			const serverIds = new Set(result.threads.map((t) => t.id));
			const localOnly = threads.value.filter((t) => !serverIds.has(t.id));
			const serverThreads: InstanceAiThreadSummary[] = result.threads.map((t) => ({
				id: t.id,
				title: t.title || NEW_CONVERSATION_TITLE,
				createdAt: t.createdAt,
				metadata: t.metadata ?? undefined,
			}));
			threads.value = [...localOnly, ...serverThreads];
		} catch {
			// Silently ignore — threads will remain client-side only
		}
	}

	async function syncThread(threadId: string): Promise<void> {
		if (persistedThreadIds.has(threadId)) return;

		const result = await ensureThread(rootStore.restApiContext, threadId);
		persistedThreadIds.add(result.thread.id);

		const existingThread = threads.value.find((thread) => thread.id === threadId);
		if (existingThread) {
			existingThread.createdAt = result.thread.createdAt;
			existingThread.title = result.thread.title || existingThread.title;
			return;
		}

		threads.value.unshift({
			id: result.thread.id,
			title: result.thread.title || NEW_CONVERSATION_TITLE,
			createdAt: result.thread.createdAt,
		});
	}

	async function loadHistoricalMessages(threadId: string): Promise<void> {
		// ── DEV-ONLY: return mock data instead of calling API ──
		messages.value = MOCK_MESSAGES;
		return;
		// ── END DEV-ONLY ──

		try {
			const result = await fetchThreadMessagesApi(rootStore.restApiContext, threadId, 100);
			// Only hydrate if we're still on the same thread and SSE hasn't delivered messages
			if (currentThreadId.value !== threadId || messages.value.length > 0) return;
			// Backend now returns InstanceAiMessage[] directly — no conversion needed
			if (result.messages.length > 0) {
				messages.value = result.messages;
				latestTasks.value = findLatestTasksFromMessages(result.messages);

				// Rebuild reducer routing state from historical messages so SSE
				// replay events (which arrive before run-sync) can reduce into
				// existing run states instead of being dropped or creating phantoms.
				for (const msg of result.messages) {
					if (msg.role !== 'assistant' || !msg.agentTree) continue;
					const groupId = msg.messageGroupId ?? msg.runId;
					if (!groupId || !isSafeObjectKey(groupId)) continue;
					const rebuiltRunState = rebuildRunStateFromTree(msg.agentTree);
					if (!rebuiltRunState) continue;
					runStateByGroupId[groupId] = rebuiltRunState;
					// Register ALL runIds in the group — not just the latest one.
					// This ensures late events from older runs in a merged A→B→C
					// chain still route to the correct message after restore.
					if (msg.runIds) {
						for (const rid of msg.runIds) {
							if (!isSafeObjectKey(rid)) continue;
							groupIdByRunId[rid] = groupId;
						}
					}
					if (msg.runId && isSafeObjectKey(msg.runId)) groupIdByRunId[msg.runId] = groupId;
				}
			}
			// Set SSE cursor to skip past events already covered by historical messages.
			// This prevents duplicate messages when SSE replays in-memory events.
			if (result.nextEventId !== null && result.nextEventId !== undefined) {
				lastEventIdByThread.value[threadId] = result.nextEventId - 1;
			}
		} catch {
			// Silently ignore — messages will appear if SSE delivers them
		}
	}

	async function loadThreadStatus(threadId: string): Promise<void> {
		try {
			const status = await fetchThreadStatusApi(rootStore.restApiContext, threadId);
			if (currentThreadId.value !== threadId) return;

			const hasActivity =
				status.hasActiveRun || status.isSuspended || status.backgroundTasks.length > 0;
			if (!hasActivity) return;

			const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
			if (!lastAssistant) return;

			if (status.hasActiveRun || status.isSuspended) {
				activeRunId.value = lastAssistant.runId ?? null;
				lastAssistant.isStreaming = status.hasActiveRun;
			}

			// Background task visibility is handled by the run-sync control frame
			// that is sent on SSE connect. No need to inject children directly here.
		} catch {
			// Silently ignore
		}
	}

	async function sendMessage(
		message: string,
		attachments?: InstanceAiAttachment[],
		pushRef?: string,
	): Promise<void> {
		// Clear amend context on new message
		amendContext.value = null;

		// Ensure SSE is connected before sending. Vue's Suspense boundary can
		// unmount → remount InstanceAiView during layout transitions, which closes
		// the SSE connection via onUnmounted. If the user sends a message before
		// the remounted component's async connectSSE() fires, the response events
		// would be lost. Re-establish the connection here as a safety net.
		if (sseState.value === 'disconnected') {
			connectSSE();
		}

		try {
			await syncThread(currentThreadId.value);
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
			return;
		}

		// 1. Add user message optimistically
		const userMessage: InstanceAiMessage = {
			id: uuidv4(),
			role: 'user',
			createdAt: new Date().toISOString(),
			content: message,
			reasoning: '',
			isStreaming: false,
			attachments: attachments && attachments.length > 0 ? attachments : undefined,
		};
		messages.value.push(userMessage);

		const isFirstMessage = messages.value.filter((m) => m.role === 'user').length === 1;
		const sentProps = {
			thread_id: currentThreadId.value,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
		};
		telemetry.track('User sent builder message', sentProps);

		// 2. POST to backend — returns { runId }
		// Thread title is generated by Mastra asynchronously after the agent responds.
		// activeRunId is set by the run-start event arriving over SSE, NOT by the POST response.
		try {
			await postMessage(
				rootStore.restApiContext,
				currentThreadId.value,
				message,
				researchMode.value || undefined,
				attachments,
				Intl.DateTimeFormat().resolvedOptions().timeZone,
				pushRef,
			);
		} catch (error: unknown) {
			const status = error instanceof ResponseError ? error.httpStatusCode : undefined;
			if (status === 409) {
				toast.showError(
					new Error('Agent is still working on your previous message'),
					'Cannot send message',
				);
			} else if (status === 400) {
				toast.showError(new Error('Message cannot be empty'), 'Invalid message');
			} else {
				toast.showError(new Error('Failed to send message. Try again.'), 'Send failed');
			}
			// Remove the optimistic user message on failure
			const idx = messages.value.indexOf(userMessage);
			if (idx !== -1) {
				messages.value.splice(idx, 1);
			}
		}
	}

	async function cancelRun(): Promise<void> {
		if (!activeRunId.value) return;
		try {
			await postCancel(rootStore.restApiContext, currentThreadId.value);
			// Don't clear activeRunId here — wait for the run-finish event via SSE
		} catch {
			toast.showError(new Error('Failed to cancel. Try again.'), 'Cancel failed');
		}
	}

	/** Cancel a specific background task. */
	async function cancelBackgroundTask(taskId: string): Promise<void> {
		try {
			await postCancelTask(rootStore.restApiContext, currentThreadId.value, taskId);
		} catch {
			toast.showError(new Error('Failed to cancel task. Try again.'), 'Cancel failed');
		}
	}

	/** Stop an agent and prime the input for amend instructions. */
	function amendAgent(agentId: string, role: string, taskId?: string): void {
		if (taskId) {
			void cancelBackgroundTask(taskId);
		} else {
			void cancelRun();
		}
		amendContext.value = { agentId, role };
	}

	async function confirmAction(
		requestId: string,
		approved: boolean,
		credentialId?: string,
		credentials?: Record<string, string>,
		autoSetup?: { credentialType: string },
		userInput?: string,
		domainAccessAction?: string,
		setupWorkflowData?: {
			action?: 'apply' | 'test-trigger';
			nodeCredentials?: Record<string, Record<string, string>>;
			nodeParameters?: Record<string, Record<string, unknown>>;
			testTriggerNode?: string;
		},
		answers?: InstanceAiConfirmResponse['answers'],
		resourceDecision?: string,
	): Promise<boolean> {
		try {
			await postConfirmation(
				rootStore.restApiContext,
				requestId,
				approved,
				credentialId,
				credentials,
				autoSetup,
				userInput,
				domainAccessAction,
				setupWorkflowData,
				answers,
				resourceDecision,
			);
			return true;
		} catch {
			toast.showError(new Error('Failed to send confirmation. Try again.'), 'Confirmation failed');
			return false;
		}
	}

	async function confirmResourceDecision(requestId: string, decision: string): Promise<void> {
		resolveConfirmation(requestId, 'approved');
		await confirmAction(
			requestId,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			decision,
		);
	}

	function toggleResearchMode(): void {
		researchMode.value = !researchMode.value;
		localStorage.setItem('instanceAi.researchMode', String(researchMode.value));
	}

	function copyFullTrace(): string {
		// Collapse consecutive text-delta / reasoning-delta events from the same agent
		// into single entries so traces are compact and readable.
		const collapsed: Array<{ timestamp: string; event: InstanceAiEvent }> = [];
		let pendingText: { timestamp: string; event: InstanceAiEvent; buffer: string } | null = null;
		let pendingReasoning: { timestamp: string; event: InstanceAiEvent; buffer: string } | null =
			null;

		for (const entry of debugEvents.value) {
			const { event } = entry;

			if (event.type === 'text-delta') {
				if (pendingText && pendingText.event.agentId === event.agentId) {
					pendingText.buffer += event.payload.text;
				} else {
					if (pendingText) {
						(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
							pendingText.buffer;
						collapsed.push(pendingText);
					}
					pendingText = {
						timestamp: entry.timestamp,
						event: { ...event, payload: { ...event.payload } },
						buffer: event.payload.text,
					};
				}
				continue;
			}

			if (event.type === 'reasoning-delta') {
				if (pendingReasoning && pendingReasoning.event.agentId === event.agentId) {
					pendingReasoning.buffer += event.payload.text;
				} else {
					if (pendingReasoning) {
						(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
							pendingReasoning.buffer;
						collapsed.push(pendingReasoning);
					}
					pendingReasoning = {
						timestamp: entry.timestamp,
						event: { ...event, payload: { ...event.payload } },
						buffer: event.payload.text,
					};
				}
				continue;
			}

			// Non-delta event — flush any pending buffers
			if (pendingText) {
				(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
					pendingText.buffer;
				collapsed.push(pendingText);
				pendingText = null;
			}
			if (pendingReasoning) {
				(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
					pendingReasoning.buffer;
				collapsed.push(pendingReasoning);
				pendingReasoning = null;
			}
			collapsed.push(entry);
		}
		// Flush remaining
		if (pendingText) {
			(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
				pendingText.buffer;
			collapsed.push(pendingText);
		}
		if (pendingReasoning) {
			(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
				pendingReasoning.buffer;
			collapsed.push(pendingReasoning);
		}

		return JSON.stringify(
			{
				threadId: currentThreadId.value,
				exportedAt: new Date().toISOString(),
				messages: messages.value,
				events: collapsed,
			},
			null,
			2,
		);
	}

	async function renameThread(threadId: string, title: string): Promise<void> {
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.title = title;
		}

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			await renameThreadApi(rootStore.restApiContext, threadId, title);
		}
	}

	function getThreadMetadata(threadId: string): Record<string, unknown> | undefined {
		return threads.value.find((t) => t.id === threadId)?.metadata;
	}

	async function updateThreadMetadata(
		threadId: string,
		metadata: Record<string, unknown>,
	): Promise<void> {
		// Optimistic update
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.metadata = { ...thread.metadata, ...metadata };
		}

		if (persistedThreadIds.has(threadId)) {
			await updateThreadMetadataApi(rootStore.restApiContext, threadId, metadata);
		}
	}

	return {
		// State
		currentThreadId,
		threads,
		sseState,
		lastEventIdByThread,
		activeRunId,
		messages,
		debugEvents,
		debugMode,
		researchMode,
		amendContext,
		feedbackByResponseId,
		creditsQuota,
		creditsClaimed,
		resolvedConfirmationIds,
		// Computed
		isStreaming,
		hasMessages,
		isGatewayConnected,
		gatewayDirectory,
		activeDirectory,
		contextualSuggestion,
		currentTasks,
		resourceRegistry,
		rateableResponseId,
		creditsRemaining,
		creditsPercentageRemaining,
		isLowCredits,
		pendingConfirmations,
		// Actions
		newThread,
		deleteThread,
		renameThread,
		getThreadMetadata,
		updateThreadMetadata,
		switchThread,
		loadThreads,
		loadHistoricalMessages,
		loadThreadStatus,
		sendMessage,
		cancelRun,
		cancelBackgroundTask,
		amendAgent,
		toggleResearchMode,
		confirmAction,
		confirmResourceDecision,
		resolveConfirmation,
		findToolCallByRequestId,
		copyFullTrace,
		submitFeedback,
		fetchCredits,
		startCreditsPushListener,
		stopCreditsPushListener,
		connectSSE,
		closeSSE,
	};
});
