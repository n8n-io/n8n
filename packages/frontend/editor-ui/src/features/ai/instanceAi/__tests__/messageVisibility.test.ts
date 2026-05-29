import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { stripInternalInstanceAiBlocks } from '../internalBlocks';
import { messageHasVisibleContent } from '../messageVisibility';

function makeAgentTree(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function assistantMessage(
	content: string,
	overrides: Partial<InstanceAiMessage> = {},
): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date(0).toISOString(),
		content,
		reasoning: '',
		isStreaming: false,
		...overrides,
	};
}

describe('messageHasVisibleContent', () => {
	it('hides assistant messages that only contain internal blocks', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('<running-tasks><task id="1">Build</task></running-tasks>'),
			),
		).toBe(false);
	});

	it('keeps assistant messages with text outside internal blocks visible', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage(
					'Done.\n<background-task-completed>{"id":"task-1"}</background-task-completed>',
				),
			),
		).toBe(true);
	});

	it('hides assistant messages that only contain attributed internal blocks', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage(
					'<planned-task-follow-up type="checkpoint">{"taskId":"task-1"}</planned-task-follow-up>',
				),
			),
		).toBe(false);
	});

	it('hides compacted builder memory summaries', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage(
					'<builder-memory-summary>\nWorkflow ID: wf-1\nWork item ID: wi-1\n</builder-memory-summary>',
				),
			),
		).toBe(false);
	});

	it('hides assistant messages whose only timeline entry is a loading legacy builder tool call', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('', {
					isStreaming: true,
					agentTree: makeAgentTree({
						status: 'active',
						toolCalls: [
							{
								toolCallId: 'tc-build',
								toolName: 'build-workflow-with-agent',
								args: {},
								isLoading: true,
								renderHint: 'builder',
							},
						],
						timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
					}),
				}),
			),
		).toBe(false);
	});

	it('keeps direct workflow mutation tool calls visible while loading', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('', {
					isStreaming: true,
					agentTree: makeAgentTree({
						status: 'active',
						toolCalls: [
							{
								toolCallId: 'tc-build',
								toolName: 'workflows',
								args: { action: 'create' },
								isLoading: true,
								renderHint: 'builder',
							},
						],
						timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
					}),
				}),
			),
		).toBe(true);
	});

	it('hides assistant messages whose only timeline entry is a skill-loading tool call', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('', {
					isStreaming: true,
					agentTree: makeAgentTree({
						status: 'active',
						toolCalls: [
							{
								toolCallId: 'tc-skill',
								toolName: 'load_skill',
								args: { name: 'workflow-builder' },
								isLoading: true,
								renderHint: 'skill',
							},
						],
						timeline: [{ type: 'tool-call', toolCallId: 'tc-skill', responseId: 'response-1' }],
					}),
				}),
			),
		).toBe(false);
	});

	it('keeps completed legacy builder tool calls visible when they render an artifact', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('', {
					agentTree: makeAgentTree({
						toolCalls: [
							{
								toolCallId: 'tc-build',
								toolName: 'build-workflow-with-agent',
								args: {},
								isLoading: false,
								renderHint: 'builder',
								result: { success: true, workflowId: 'wf-1', workflowName: 'Built workflow' },
							},
						],
						timeline: [{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'response-1' }],
					}),
				}),
			),
		).toBe(true);
	});

	it('strips complete attributed internal blocks without eating following text', () => {
		expect(
			stripInternalInstanceAiBlocks(
				'Done.\n<planned-task-follow-up type="checkpoint">{"taskId":"task-1"}</planned-task-follow-up>\nVisible next',
			),
		).toBe('Done.\n\nVisible next');
	});
});
