import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { AgentDbMessage, BuiltTool } from '../../types';
import { DeferredToolManager, LOAD_TOOL_TOOL_NAME } from '../tools/deferred-tool-manager';
import { buildToolMap, toAiSdkTools } from '../tools/tool-adapter';

function makeTool(name: string, legacyNames?: string[]): BuiltTool {
	const builder = new Tool(name)
		.description(`${name} description`)
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ ok: true }));
	if (legacyNames) builder.legacyNames(...legacyNames);
	return builder.build();
}

function loadToolMessage(toolName: string): AgentDbMessage {
	return {
		id: 'm-1',
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: LOAD_TOOL_TOOL_NAME,
				input: { toolName },
				state: 'resolved',
				output: { status: 'loaded', toolName },
			},
		],
	} as unknown as AgentDbMessage;
}

describe('tool legacy names', () => {
	it('stores legacy names on the built tool', () => {
		expect(makeTool('new_name', ['old-name']).legacyNames).toEqual(['old-name']);
		expect(makeTool('plain').legacyNames).toBeUndefined();
	});

	it('resolves a legacy name to the current tool in the tool map', () => {
		const tool = makeTool('new_name', ['old-name']);
		const map = buildToolMap([tool]);

		expect(map.get('new_name')).toBe(tool);
		expect(map.get('old-name')).toBe(tool);
	});

	it('lets a current tool name win over another tool legacy name', () => {
		const renamed = makeTool('new_name', ['shared']);
		const current = makeTool('shared');
		const map = buildToolMap([renamed, current]);

		expect(map.get('shared')).toBe(current);
	});

	it('does not expose legacy names to the model', () => {
		const aiTools = toAiSdkTools([makeTool('new_name', ['old-name'])]);

		expect(Object.keys(aiTools)).toEqual(['new_name']);
	});

	it('loads a deferred tool requested by its legacy name', () => {
		const manager = new DeferredToolManager([makeTool('new_name', ['old-name'])]);

		const result = manager.load('old-name');

		expect(result.status).toBe('loaded');
		expect(result.toolName).toBe('new_name');
		expect(manager.getLoadedTools().map((t) => t.name)).toEqual(['new_name']);
	});

	it('hydrates a deferred tool loaded under its legacy name', () => {
		const manager = new DeferredToolManager([makeTool('new_name', ['old-name'])]);

		manager.hydrateLoadedToolsFromMessages([loadToolMessage('old-name')]);

		expect(manager.getLoadedTools().map((t) => t.name)).toEqual(['new_name']);
	});
});
