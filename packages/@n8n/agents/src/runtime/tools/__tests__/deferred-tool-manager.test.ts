import { z } from 'zod';

import { Tool } from '../../../sdk/tool';
import type { AgentDbMessage } from '../../../types/sdk/message';
import { DeferredToolManager } from '../deferred-tool-manager';

function makeTool(name: string) {
	return new Tool(name)
		.description(`${name} test tool`)
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

function assistantMessage(content: unknown[]): AgentDbMessage {
	return { role: 'assistant', content } as unknown as AgentDbMessage;
}

function loadToolBlock(toolName: string): unknown {
	return {
		type: 'tool-call',
		toolName: 'load_tool',
		state: 'resolved',
		input: { toolName },
		output: { status: 'loaded', toolName, message: 'ok' },
	};
}

function loadSkillBlock(input: Record<string, unknown>, output: unknown): unknown {
	return {
		type: 'tool-call',
		toolName: 'load_skill',
		state: 'resolved',
		input,
		output,
	};
}

const SKILL_CONTENT_OUTPUT = {
	type: 'content',
	value: [{ type: 'text', text: '[Skill: "workflow-builder"]\n\n# instructions' }],
};

function makeManager() {
	return new DeferredToolManager([makeTool('plan-workflow-skeleton'), makeTool('other-tool')], {
		skillRecommendedTools: new Map([
			['skill-1', ['plan-workflow-skeleton', 'not-a-registered-tool']],
			['workflow-builder', ['plan-workflow-skeleton', 'not-a-registered-tool']],
		]),
	});
}

describe('DeferredToolManager skill auto-load', () => {
	it('marks a skill’s recommended tools loaded after a successful load_skill by name', () => {
		const manager = makeManager();
		manager.hydrateLoadedToolsFromMessages([
			assistantMessage([loadSkillBlock({ name: 'workflow-builder' }, SKILL_CONTENT_OUTPUT)]),
		]);

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['plan-workflow-skeleton']);
	});

	it('resolves the skill by id as well', () => {
		const manager = makeManager();
		manager.hydrateLoadedToolsFromMessages([
			assistantMessage([loadSkillBlock({ skillId: 'skill-1' }, SKILL_CONTENT_OUTPUT)]),
		]);

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['plan-workflow-skeleton']);
	});

	it('ignores linked-file loads and failed loads', () => {
		const manager = makeManager();
		manager.hydrateLoadedToolsFromMessages([
			assistantMessage([
				loadSkillBlock(
					{ name: 'workflow-builder', filePath: 'references/x.md' },
					SKILL_CONTENT_OUTPUT,
				),
				loadSkillBlock({ name: 'workflow-builder' }, { ok: false, success: false, error: 'nope' }),
				loadSkillBlock({ name: 'unknown-skill' }, SKILL_CONTENT_OUTPUT),
			]),
		]);

		expect(manager.getLoadedTools()).toEqual([]);
	});

	it('combines skill auto-loads with explicit load_tool calls and survives re-hydration', () => {
		const manager = makeManager();
		const messages = [
			assistantMessage([loadToolBlock('other-tool')]),
			assistantMessage([loadSkillBlock({ name: 'workflow-builder' }, SKILL_CONTENT_OUTPUT)]),
		];
		manager.hydrateLoadedToolsFromMessages(messages);
		manager.hydrateLoadedToolsFromMessages(messages);

		expect(
			manager
				.getLoadedTools()
				.map((tool) => tool.name)
				.sort(),
		).toEqual(['other-tool', 'plan-workflow-skeleton']);
	});
});
