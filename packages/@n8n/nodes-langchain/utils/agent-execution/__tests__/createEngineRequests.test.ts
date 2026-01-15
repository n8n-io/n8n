import type { DynamicStructuredTool } from '@langchain/classic/tools';

import { createEngineRequests } from '../createEngineRequests';
import type { ToolCallRequest, ToolMetadata } from '../types';

const createMockTool = (name: string, metadata: ToolMetadata = {}): DynamicStructuredTool =>
	({
		name,
		metadata,
	}) as DynamicStructuredTool;

describe('createEngineRequests', () => {
	describe('non-HITL tools', () => {
		it('creates request without HITL metadata', async () => {
			const tools = [createMockTool('my_tool', { sourceNodeName: 'Tool Node' })];
			const toolCalls: ToolCallRequest[] = [
				{ tool: 'my_tool', toolInput: { query: 'test' }, toolCallId: 'call-1' },
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].nodeName).toBe('Tool Node');
			expect(result[0].metadata?.hitl).toBeUndefined();
			expect(result[0].input).toEqual({ query: 'test' });
		});

		it('filters out tools without sourceNodeName', async () => {
			const tools = [createMockTool('orphan_tool', {})];
			const toolCalls: ToolCallRequest[] = [
				{ tool: 'orphan_tool', toolInput: {}, toolCallId: 'call-1' },
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(0);
		});

		it('filters out unknown tools', async () => {
			const tools = [createMockTool('known_tool', { sourceNodeName: 'Node' })];
			const toolCalls: ToolCallRequest[] = [
				{ tool: 'unknown_tool', toolInput: {}, toolCallId: 'call-1' },
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(0);
		});
	});

	describe('HITL tools', () => {
		it('adds HITL metadata when gatedToolNodeName is present', async () => {
			const tools = [
				createMockTool('hitl_tool', {
					sourceNodeName: 'HITL Node',
					gatedToolNodeName: 'Gated Tool Node',
					isFromToolkit: true,
				}),
			];
			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'hitl_tool',
					toolInput: { toolParameters: { query: 'test' }, hitlParameters: { param: 'test' } },
					toolCallId: 'call-1',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata?.hitl).toEqual({
				gatedToolNodeName: 'Gated Tool Node',
				toolName: 'hitl_tool',
				originalInput: { query: 'test' },
			});
			expect(result[0].input).toEqual({
				toolParameters: '{"query":"test"}',
				param: 'test',
				tool: 'hitl_tool',
			});
		});

		it('adds toolName to input for HITL tools', async () => {
			const tools = [
				createMockTool('hitl_tool', {
					sourceNodeName: 'HITL Node',
					gatedToolNodeName: 'Gated Tool Node',
					isFromToolkit: true,
				}),
			];
			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'hitl_tool',
					toolInput: { toolParameters: { query: 'test' } },
					toolCallId: 'call-1',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result[0].input).toEqual({ toolParameters: '{"query":"test"}', tool: 'hitl_tool' });
		});
	});

	describe('toolkit tools', () => {
		it('adds tool name to input for toolkit tools', async () => {
			const tools = [
				createMockTool('toolkit_tool', {
					sourceNodeName: 'Toolkit Node',
					isFromToolkit: true,
				}),
			];
			const toolCalls: ToolCallRequest[] = [
				{ tool: 'toolkit_tool', toolInput: { param: 'value' }, toolCallId: 'call-1' },
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result[0].input).toEqual({ param: 'value', tool: 'toolkit_tool' });
		});
	});

	describe('mixed tool types', () => {
		it('processes multiple tool calls correctly', async () => {
			const tools = [
				createMockTool('regular_tool', { sourceNodeName: 'Regular Node' }),
				createMockTool('hitl_tool', {
					sourceNodeName: 'HITL Node',
					gatedToolNodeName: 'Gated Node',
				}),
			];
			const toolCalls: ToolCallRequest[] = [
				{ tool: 'regular_tool', toolInput: { a: 1 }, toolCallId: 'call-1' },
				{ tool: 'hitl_tool', toolInput: { b: 2 }, toolCallId: 'call-2' },
			];

			const result = await createEngineRequests(toolCalls, 5, tools);

			expect(result).toHaveLength(2);

			expect(result[0].metadata?.hitl).toBeUndefined();
			expect(result[0].metadata?.itemIndex).toBe(5);

			expect(result[1].metadata?.hitl).toBeDefined();
			expect(result[1].metadata?.itemIndex).toBe(5);
		});
	});
});
