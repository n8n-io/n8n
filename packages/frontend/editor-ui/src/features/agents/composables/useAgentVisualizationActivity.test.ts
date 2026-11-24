import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { buildAgentVisualization } from '../components/agentVisualization';
import type { AgentVisualizationNode } from '../components/AgentVisualization.types';
import {
	findVisualizationActivity,
	useAgentVisualizationActivity,
} from './useAgentVisualizationActivity';

const root = buildAgentVisualization(
	{
		name: 'Assistant',
		model: '',
		instructions: '',
		tools: [
			{
				type: 'node',
				name: 'Search mail',
				node: { nodeType: 'gmail', nodeTypeVersion: 1, nodeParameters: {} },
			},
			{ type: 'workflow', workflow: 'D&D Invite' },
		],
		mcpServers: [
			{ name: 'Work docs', url: '', transport: 'streamableHttp', authentication: 'none' },
		],
		skills: [{ type: 'skill', id: 'research' }],
	},
	null,
	[
		{
			id: 'guide',
			agentId: 'agent',
			fileName: 'Guide.pdf',
			mimeType: 'application/pdf',
			fileSizeBytes: 1,
			createdAt: '',
		},
	],
	[{ id: 'research', skill: { name: 'Research', description: '', instructions: '' } }],
	(key) => key,
);

describe('findVisualizationActivity', () => {
	it('matches runtime node and workflow names and their parent sections', () => {
		expect(findVisualizationActivity(root, 'Search_mail', {})).toContain('tool-0');
		expect(findVisualizationActivity(root, 'Search_mail', {})).toContain('tools');
		expect(findVisualizationActivity(root, 'd-d-invite', {})).toContain('workflows');
		expect(findVisualizationActivity(root, 'Work_docs_search', {})).toContain('mcp-0');
	});
	it('matches skills and knowledge file inputs without treating absent identifiers as matches', () => {
		expect(findVisualizationActivity(root, 'load_skill', { skillId: 'research' })).toEqual([
			'knowledge',
			'skills',
			'skill-research',
		]);
		expect(findVisualizationActivity(root, 'load_skill', {})).toEqual(['knowledge', 'skills']);
		expect(findVisualizationActivity(root, 'read_file', { fileId: 'guide' })).toEqual([
			'knowledge',
			'file-guide',
		]);
		expect(
			findVisualizationActivity(root, 'search_text', { path: ['knowledge/Guide.pdf'] }),
		).toContain('file-guide');
		expect(findVisualizationActivity(root, 'recall_memory', {})).toEqual(['memory']);
		expect(findVisualizationActivity(root, 'unknown_tool', {})).toEqual([]);
	});
	it('chooses the most specific MCP prefix and gives configured tool names priority', () => {
		const graph: AgentVisualizationNode = {
			id: 'agent',
			label: 'Agent',
			icon: 'bot',
			children: [
				{ id: 'a', label: 'A', icon: 'mcp', activity: { toolPrefix: 'a_' } },
				{ id: 'ab', label: 'AB', icon: 'mcp', activity: { toolPrefix: 'a_b_' } },
				{ id: 'tool', label: 'Tool', icon: 'wrench', activity: { toolNames: ['a_b_local'] } },
			],
		};
		expect(findVisualizationActivity(graph, 'a_b_search', {})).toEqual(['agent', 'ab']);
		expect(findVisualizationActivity(graph, 'a_b_local', {})).toEqual(['agent', 'tool']);
	});
});

describe('useAgentVisualizationActivity', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());
	function setup() {
		const scope = effectScope();
		const session = ref<string | undefined>('session');
		const activity = scope.run(() => useAgentVisualizationActivity(ref(root), session))!;
		return { ...activity, session, stop: () => scope.stop() };
	}
	it('tracks concurrent calls and briefly retains fast calls after completion', () => {
		const activity = setup();
		activity.setStreaming(true);
		activity.onEvent({
			type: 'tool-execution-start',
			toolCallId: 'a',
			toolName: 'Search_mail',
			startTime: 1,
		});
		activity.onEvent({
			type: 'tool-execution-start',
			toolCallId: 'b',
			toolName: 'd-d-invite',
			startTime: 1,
		});
		expect(activity.activeNodeIds.value).toEqual(expect.arrayContaining(['tools', 'workflows']));
		activity.onEvent({
			type: 'tool-execution-end',
			toolCallId: 'a',
			toolName: 'Search_mail',
			endTime: 2,
			isError: false,
		});
		vi.advanceTimersByTime(1000);
		expect(activity.activeNodeIds.value).not.toContain('tools');
		expect(activity.activeNodeIds.value).toContain('workflows');
		expect(activity.running.value).toBe(true);
		activity.onEvent({ type: 'done' });
		expect(activity.activeNodeIds.value).toEqual([]);
		expect(activity.running.value).toBe(false);
		activity.stop();
	});
	it('uses the tool input to highlight the loaded skill and clears failed or suspended calls', () => {
		const activity = setup();
		activity.onEvent({
			type: 'tool-call',
			toolCallId: 'skill',
			toolName: 'load_skill',
			input: { name: 'research' },
		});
		expect(activity.activeNodeIds.value).toEqual([]);
		activity.onEvent({
			type: 'tool-execution-start',
			toolCallId: 'skill',
			toolName: 'load_skill',
			startTime: 1,
		});
		expect(activity.activeNodeIds.value).toContain('skill-research');
		activity.onEvent({
			type: 'tool-execution-end',
			toolCallId: 'skill',
			toolName: 'load_skill',
			endTime: 2,
			isError: true,
		});
		expect(activity.activeNodeIds.value).toEqual([]);
		expect(activity.failedNodeIds.value).toContain('skill-research');
		activity.onEvent({
			type: 'tool-execution-start',
			toolCallId: 'approval',
			toolName: 'Search_mail',
			startTime: 1,
		});
		activity.onEvent({
			type: 'tool-call-suspended',
			payload: { toolCallId: 'approval', toolName: 'approval', runId: 'run', input: {} },
		});
		expect(activity.activeNodeIds.value).toEqual([]);
		activity.stop();
	});
	it('clears activity and timers when the session changes or the scope is disposed', async () => {
		const activity = setup();
		activity.setStreaming(true);
		activity.onEvent({
			type: 'tool-execution-start',
			toolCallId: 'a',
			toolName: 'Search_mail',
			startTime: 1,
		});
		activity.onEvent({ type: 'tool-result', toolCallId: 'a', toolName: 'Search_mail', output: {} });
		activity.session.value = 'next';
		await nextTick();
		expect(activity.activeNodeIds.value).toEqual([]);
		expect(activity.running.value).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
		activity.stop();
	});
	it('clears a failed tool on retry and does not mark a canceled call as failed', () => {
		const activity = setup();
		const start = {
			type: 'tool-execution-start' as const,
			toolCallId: 'a',
			toolName: 'Search_mail',
			startTime: 1,
		};
		activity.onEvent(start);
		activity.onEvent({
			type: 'tool-execution-end',
			toolCallId: 'a',
			toolName: 'Search_mail',
			endTime: 2,
			isError: true,
		});
		expect(activity.failedNodeIds.value).toContain('tools');
		activity.onEvent({ ...start, toolCallId: 'b' });
		expect(activity.failedNodeIds.value).toEqual([]);
		activity.onEvent({
			type: 'tool-result',
			toolCallId: 'b',
			toolName: 'Search_mail',
			canceled: true,
			output: {},
		});
		expect(activity.failedNodeIds.value).toEqual([]);
		activity.stop();
	});
});
