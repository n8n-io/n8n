import { channelConfigSchema } from '@n8n/api-types';
import type { InterruptibleToolContext } from '@n8n/agents';
import type { Mock } from 'vitest';

import { ASK_LLM_TOOL_NAME } from '@n8n/api-types';

import {
	BUILDER_EXCLUDED_TOOL_NAMES,
	BUILDER_EXTRA_TOOL_NAMES,
	createAskQuestionsBuilderTool,
	createConfigureChannelBuilderTool,
	INSTANCE_AI_BUILDER_ADDENDUM,
} from '../instance-ai-builder-extra-tools';

interface TestCtx {
	resumeData?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return {
		resumeData: overrides?.resumeData,
		suspend: vi.fn(async (x: unknown) => x),
	};
}

describe('createConfigureChannelBuilderTool', () => {
	function buildTool(availableTypes: string[] = ['slack', 'telegram', 'linear']) {
		return createConfigureChannelBuilderTool({
			agentId: 'agent-1',
			projectId: 'project-1',
			listChatIntegrationTypes: () => availableTypes,
		});
	}

	it('has the expected tool name', () => {
		expect(buildTool().name).toBe(BUILDER_EXTRA_TOOL_NAMES.CONFIGURE_CHANNEL);
	});

	it('suspends with a channelConfig payload conforming to channelConfigSchema on first call', async () => {
		const ctx = makeCtx();

		await buildTool().handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toEqual(
			expect.objectContaining({
				requestId: expect.any(String),
				message: expect.any(String),
				severity: 'info',
				channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
				projectId: 'project-1',
			}),
		);
		expect(() => channelConfigSchema.parse(payload.channelConfig)).not.toThrow();
	});

	it('generates a fresh requestId on every suspend call', async () => {
		const tool = buildTool();
		const ctx1 = makeCtx();
		const ctx2 = makeCtx();

		await tool.handler!({ integrationType: 'slack' }, ctx1 as unknown as InterruptibleToolContext);
		await tool.handler!({ integrationType: 'slack' }, ctx2 as unknown as InterruptibleToolContext);

		const requestId1 = (ctx1.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		const requestId2 = (ctx2.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		expect(requestId1).not.toBe(requestId2);
	});

	it('rejects an integrationType not returned by listChatIntegrationTypes', async () => {
		const ctx = makeCtx();

		const result = await buildTool().handler!(
			{ integrationType: 'discord' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				ok: false,
				errors: [
					expect.objectContaining({
						message: expect.stringContaining('Unsupported chat channel "discord"'),
					}),
				],
			}),
		);
	});

	it('reports no channels available when the catalog is empty', async () => {
		const ctx = makeCtx();

		const result = (await buildTool([]).handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		)) as { errors: Array<{ message: string }> };

		expect(result.errors[0].message).toContain('No chat channels are currently available.');
	});

	it('resume leg is handled before validation and returns connected: true on approval', async () => {
		const ctx = makeCtx({ resumeData: { approved: true } });

		// Deliberately pass a type not in the catalog — checkpoint-rebuild safety
		// means the resume leg must not re-validate against the (possibly
		// unavailable) integration catalog.
		const result = await buildTool([]).handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ connected: true });
	});

	it('returns connected: false when the user skips (dismissal)', async () => {
		const ctx = makeCtx({ resumeData: { approved: false } });

		const result = await buildTool().handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ connected: false });
	});
});

describe('createAskQuestionsBuilderTool', () => {
	function buildTool() {
		return createAskQuestionsBuilderTool();
	}

	it('has the expected tool name', () => {
		expect(buildTool().name).toBe(BUILDER_EXTRA_TOOL_NAMES.ASK_QUESTIONS);
	});

	it('suspends with all questions batched into a single inputType: questions card', async () => {
		const ctx = makeCtx();

		await buildTool().handler!(
			{
				questions: [
					{ question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ question: 'Any notes?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toEqual(
			expect.objectContaining({
				requestId: expect.any(String),
				message: 'The agent builder has questions',
				severity: 'info',
				inputType: 'questions',
				questions: [
					{ id: 'q1', question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ id: 'q2', question: 'Any notes?', type: 'text' },
				],
			}),
		);
	});

	it('defaults missing question ids to q1..qN while preserving explicit ids', async () => {
		const ctx = makeCtx();

		await buildTool().handler!(
			{
				questions: [
					{ id: 'custom-id', question: 'First?', type: 'text' },
					{ question: 'Second?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		const payload = ctx.suspend.mock.calls[0][0] as { questions: Array<{ id: string }> };
		expect(payload.questions.map((q) => q.id)).toEqual(['custom-id', 'q2']);
	});

	it('uses introMessage as the suspend message and passes it through when provided', async () => {
		const ctx = makeCtx();

		await buildTool().handler!(
			{
				questions: [{ question: 'Which region?', type: 'single', options: ['us', 'eu'] }],
				introMessage: 'A couple of quick questions',
			},
			ctx as unknown as InterruptibleToolContext,
		);

		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload.message).toBe('A couple of quick questions');
		expect(payload.introMessage).toBe('A couple of quick questions');
	});

	it('returns answered: false when the resume is a dismissal', async () => {
		const ctx = makeCtx({ resumeData: { approved: false } });

		const result = await buildTool().handler!(
			{ questions: [{ question: 'Which region?', type: 'text' }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ answered: false });
	});

	it('returns answered: false when resume has no answers', async () => {
		const ctx = makeCtx({ resumeData: { approved: true } });

		const result = await buildTool().handler!(
			{ questions: [{ question: 'Which region?', type: 'text' }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ answered: false });
	});

	it('returns answered: true with question text merged into each answer on resume', async () => {
		const ctx = makeCtx({
			resumeData: {
				approved: true,
				answers: [
					{ questionId: 'q1', selectedOptions: ['us'] },
					{ questionId: 'q2', selectedOptions: [], customText: 'no notes' },
				],
			},
		});

		const result = await buildTool().handler!(
			{
				questions: [
					{ question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ question: 'Any notes?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({
			answered: true,
			answers: [
				{ questionId: 'q1', selectedOptions: ['us'], question: 'Which region?' },
				{
					questionId: 'q2',
					selectedOptions: [],
					customText: 'no notes',
					question: 'Any notes?',
				},
			],
		});
	});
});

describe('INSTANCE_AI_BUILDER_ADDENDUM', () => {
	it('instructs the sub-agent to always use configure_channel for chat channels', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('configure_channel');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('ask_credential');
	});

	it('instructs the sub-agent to batch multiple questions with ask_questions', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('ask_questions');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('ask_question');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'ALWAYS use this when you have more than one question',
		);
	});

	it('declares ask_llm unavailable and never used for chat-channel credentials', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('ask_llm` is NOT available');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('NEVER use it for chat-channel credentials');
	});
});

describe('BUILDER_EXCLUDED_TOOL_NAMES', () => {
	it('excludes ask_llm, which has no card UI in instance-AI chat', () => {
		expect(BUILDER_EXCLUDED_TOOL_NAMES).toContain(ASK_LLM_TOOL_NAME);
	});
});
