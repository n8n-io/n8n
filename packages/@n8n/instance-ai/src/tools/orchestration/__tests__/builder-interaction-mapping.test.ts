import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	cancellationResumeSchema,
	channelConfigSchema,
	credentialRequestSchema,
	InstanceAiConfirmRequestDto,
} from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import {
	builderCancellationResume,
	mapBuilderSuspendPayload,
	translateConfirmToBuilderResume,
} from '../builder-interaction-mapping';

// Fixtures built via `.parse()` on the real schemas the builder's
// `.suspend(...)` calls embed — see ask-question.tool.ts / ask-credential.tool.ts.
const askQuestionSuspendPayload = (
	overrides: Partial<Parameters<typeof askQuestionInputSchema.parse>[0]> = {},
) =>
	askQuestionInputSchema.parse({
		question: 'Which service should send the alert?',
		options: [
			{ label: 'Slack', value: 'slack' },
			{ label: 'Email', value: 'email' },
		],
		...overrides,
	});

const askCredentialSuspendPayload = (
	overrides: Partial<Parameters<typeof askCredentialInputSchema.parse>[0]> = {},
) =>
	askCredentialInputSchema.parse({
		purpose: 'Connect to Slack to send messages',
		nodeType: 'n8n-nodes-base.slack',
		credentialType: 'slackApi',
		...overrides,
	});

// Local mirrors of the cli-injected tool names (BUILDER_EXTRA_TOOL_NAMES in
// packages/cli/src/modules/agents/instance-ai-builder-extra-tools.ts) — tests
// can't import from cli.
const CONFIGURE_CHANNEL_TOOL_NAME = 'configure_channel';
const ASK_QUESTIONS_TOOL_NAME = 'ask_questions';

// configure_channel's suspend schema (configureChannelSuspendSchema) and
// ask_questions's (askQuestionsSuspendSchema) both live in the cli-only
// extra-tools file, so they can't be `.parse()`d here the way ask_question's/
// ask_credential's can. `channelConfig` is built via the real, shared
// `channelConfigSchema` so byte-for-byte preservation can be proven against it.
const configureChannelSuspendPayload = (overrides: Record<string, unknown> = {}) => ({
	requestId: 'tool-req-1',
	message: 'Set up the slack channel',
	severity: 'info' as const,
	channelConfig: channelConfigSchema.parse({ integrationType: 'slack', agentId: 'agent-1' }),
	projectId: 'project-1',
	...overrides,
});

const askQuestionsSuspendPayload = (overrides: Record<string, unknown> = {}) => ({
	requestId: 'tool-req-2',
	message: 'The agent builder has questions',
	severity: 'info' as const,
	inputType: 'questions' as const,
	questions: [
		{
			id: 'q1',
			question: 'Which service should send the alert?',
			type: 'single' as const,
			options: ['Slack', 'Email'],
		},
	],
	...overrides,
});

describe('mapBuilderSuspendPayload', () => {
	describe('ask_question', () => {
		it('maps a single-select question (multiple options, allowMultiple false)', () => {
			const payload = askQuestionSuspendPayload();

			const result = mapBuilderSuspendPayload(ASK_QUESTION_TOOL_NAME, payload, 'req-1');

			expect(result).toEqual({
				requestId: 'req-1',
				message: 'Which service should send the alert?',
				severity: 'info',
				inputType: 'questions',
				questions: [
					{
						id: 'q1',
						question: 'Which service should send the alert?',
						type: 'single',
						options: ['Slack', 'Email'],
					},
				],
			});
		});

		it('maps a multi-select question (allowMultiple true)', () => {
			const payload = askQuestionSuspendPayload({ allowMultiple: true });

			const result = mapBuilderSuspendPayload(ASK_QUESTION_TOOL_NAME, payload, 'req-2');

			expect(result).toMatchObject({
				inputType: 'questions',
				questions: [{ type: 'multi', options: ['Slack', 'Email'] }],
			});
		});

		it('maps an open-ended question (empty options) to a text question', () => {
			const payload = askQuestionSuspendPayload({ question: 'Anything else to add?', options: [] });

			const result = mapBuilderSuspendPayload(ASK_QUESTION_TOOL_NAME, payload, 'req-3');

			expect(result).toMatchObject({
				inputType: 'questions',
				questions: [{ type: 'text', options: [] }],
			});
		});

		it('parses defensively when the payload is nested under `input`', () => {
			const payload = { input: askQuestionSuspendPayload() };

			const result = mapBuilderSuspendPayload(ASK_QUESTION_TOOL_NAME, payload, 'req-4');

			expect(result).toMatchObject({ inputType: 'questions' });
		});
	});

	describe('ask_credential / ask_embedding_credential', () => {
		it('maps ask_credential to a credential request card conforming to credentialRequestSchema', () => {
			const payload = askCredentialSuspendPayload();

			const result = mapBuilderSuspendPayload(ASK_CREDENTIAL_TOOL_NAME, payload, 'req-5');

			expect(result).toEqual({
				requestId: 'req-5',
				message: 'Connect to Slack to send messages',
				severity: 'info',
				credentialRequests: [
					{
						credentialType: 'slackApi',
						reason: 'Connect to Slack to send messages',
						existingCredentials: [],
					},
				],
				credentialFlow: { stage: 'generic' },
			});
			expect(
				(result.credentialRequests as unknown[]).map((entry) =>
					credentialRequestSchema.parse(entry),
				),
			).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack to send messages',
					existingCredentials: [],
				},
			]);
		});

		it('maps ask_embedding_credential the same way as ask_credential', () => {
			const payload = askCredentialSuspendPayload({ purpose: 'Embeddings for episodic memory' });

			const result = mapBuilderSuspendPayload(ASK_EMBEDDING_CREDENTIAL_TOOL_NAME, payload, 'req-6');

			expect(result).toMatchObject({
				message: 'Embeddings for episodic memory',
				credentialFlow: { stage: 'generic' },
			});
			expect(
				(result.credentialRequests as unknown[]).map((entry) =>
					credentialRequestSchema.parse(entry),
				),
			).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Embeddings for episodic memory',
					existingCredentials: [],
				},
			]);
		});

		it('populates existingCredentials from the 4th `enrichment` parameter', () => {
			const payload = askCredentialSuspendPayload();

			const result = mapBuilderSuspendPayload(ASK_CREDENTIAL_TOOL_NAME, payload, 'req-7', {
				existingCredentials: [{ id: 'cred-1', name: 'My Slack account' }],
			});

			expect(result.credentialRequests).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack to send messages',
					existingCredentials: [{ id: 'cred-1', name: 'My Slack account' }],
				},
			]);
			expect(
				(result.credentialRequests as unknown[]).map((entry) =>
					credentialRequestSchema.parse(entry),
				),
			).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack to send messages',
					existingCredentials: [{ id: 'cred-1', name: 'My Slack account' }],
				},
			]);
		});

		it('defaults existingCredentials to an empty array when enrichment is omitted', () => {
			const payload = askCredentialSuspendPayload();

			const result = mapBuilderSuspendPayload(ASK_CREDENTIAL_TOOL_NAME, payload, 'req-8');

			expect(result.credentialRequests).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack to send messages',
					existingCredentials: [],
				},
			]);
		});

		it('parses defensively when the payload is nested under `input`', () => {
			const payload = { input: askCredentialSuspendPayload() };

			const result = mapBuilderSuspendPayload(ASK_CREDENTIAL_TOOL_NAME, payload, 'req-9');

			expect(result).toMatchObject({ credentialFlow: { stage: 'generic' } });
			expect(
				(result.credentialRequests as unknown[]).map((entry) =>
					credentialRequestSchema.parse(entry),
				),
			).toEqual([
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack to send messages',
					existingCredentials: [],
				},
			]);
		});
	});

	describe('configure_channel', () => {
		it('passes the suspend payload through with requestId replaced, preserving channelConfig byte-for-byte', () => {
			const payload = configureChannelSuspendPayload();

			const result = mapBuilderSuspendPayload(
				CONFIGURE_CHANNEL_TOOL_NAME,
				payload,
				'orchestrator-req-1',
			);

			expect(result).toEqual({ ...payload, requestId: 'orchestrator-req-1' });
			expect(channelConfigSchema.parse(result.channelConfig)).toEqual(payload.channelConfig);
		});

		it('takes precedence over the generic approval fallback even for a minimal payload', () => {
			const result = mapBuilderSuspendPayload(
				CONFIGURE_CHANNEL_TOOL_NAME,
				{ message: 'Set up channel' },
				'req-x',
			);

			expect(result).toEqual({ message: 'Set up channel', requestId: 'req-x' });
			expect(result.inputType).toBeUndefined();
		});
	});

	describe('ask_questions', () => {
		it('passes the suspend payload through with requestId replaced', () => {
			const payload = askQuestionsSuspendPayload();

			const result = mapBuilderSuspendPayload(
				ASK_QUESTIONS_TOOL_NAME,
				payload,
				'orchestrator-req-2',
			);

			expect(result).toEqual({ ...payload, requestId: 'orchestrator-req-2' });
		});

		it('preserves introMessage and multiple batched questions unchanged', () => {
			const payload = askQuestionsSuspendPayload({
				introMessage: 'A couple of quick questions',
				questions: [
					{ id: 'q1', question: 'Which service?', type: 'single', options: ['Slack', 'Email'] },
					{ id: 'q2', question: 'Anything else?', type: 'text' },
				],
			});

			const result = mapBuilderSuspendPayload(ASK_QUESTIONS_TOOL_NAME, payload, 'req-y');

			expect(result).toEqual({ ...payload, requestId: 'req-y' });
		});

		it('takes precedence over the generic approval fallback', () => {
			const result = mapBuilderSuspendPayload(ASK_QUESTIONS_TOOL_NAME, {}, 'req-z');

			expect(result).toEqual({ requestId: 'req-z' });
			expect(result.inputType).toBeUndefined();
		});
	});

	describe('unknown tool / unparseable payload fallback', () => {
		it('falls back to a generic approval card for an unknown tool name', () => {
			const result = mapBuilderSuspendPayload(
				'some_other_tool',
				{ message: 'Confirm this?' },
				'req-9',
			);

			expect(result).toEqual({
				requestId: 'req-9',
				message: 'Confirm this?',
				severity: 'info',
				inputType: 'approval',
			});
		});

		it('falls back to a default message when the payload has none', () => {
			const result = mapBuilderSuspendPayload('some_other_tool', {}, 'req-10');

			expect(result).toEqual({
				requestId: 'req-10',
				message: 'The agent builder needs your input',
				severity: 'info',
				inputType: 'approval',
			});
		});

		it('falls back to a generic approval card when ask_question payload does not match the schema', () => {
			const result = mapBuilderSuspendPayload(
				ASK_QUESTION_TOOL_NAME,
				{ message: 'Malformed suspend payload' },
				'req-11',
			);

			expect(result).toEqual({
				requestId: 'req-11',
				message: 'Malformed suspend payload',
				severity: 'info',
				inputType: 'approval',
			});
		});

		it('stringifies a non-string message on fallback', () => {
			const result = mapBuilderSuspendPayload('some_other_tool', { message: 42 }, 'req-12');

			expect(result.message).toBe('42');
		});

		it('falls back to the default message when `message` is a non-primitive value', () => {
			const result = mapBuilderSuspendPayload(
				'some_other_tool',
				{ message: { nested: 'object' } },
				'req-13',
			);

			expect(result.message).toBe('The agent builder needs your input');
		});
	});
});

describe('translateConfirmToBuilderResume', () => {
	describe('ask_question', () => {
		it('translates a dismissal into a cancellation resume', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, { approved: false });

			expect(result).toEqual({
				ok: true,
				resumeData: builderCancellationResume('User dismissed the question'),
			});
			if (!result.ok) throw new Error('expected ok result');
			expect(cancellationResumeSchema.parse(result.resumeData)).toEqual(
				builderCancellationResume('User dismissed the question'),
			);
		});

		it('treats a missing top-level `approved` field as approved', () => {
			// `questionsConfirmSchema` (the FE wire DTO) has no top-level `approved` field.
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
			});

			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error('expected ok result');
			expect(askQuestionResumeSchema.parse(result.resumeData)).toEqual({ values: ['slack'] });
		});

		it('maps selected options from the first answer to `values`, validated by askQuestionResumeSchema', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: ['slack', 'email'] }],
			});

			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error('expected ok result');
			expect(askQuestionResumeSchema.parse(result.resumeData)).toEqual({
				values: ['slack', 'email'],
			});
		});

		it('includes freeform customText in `values`', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: [], customText: 'Something custom' }],
			});

			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error('expected ok result');
			expect(askQuestionResumeSchema.parse(result.resumeData)).toEqual({
				values: ['Something custom'],
			});
		});

		it('returns a cancellation resume when approved but no answer values are present', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: [] }],
			});

			expect(result).toEqual({
				ok: true,
				resumeData: builderCancellationResume('User skipped the question'),
			});
			if (!result.ok) throw new Error('expected ok result');
			expect(cancellationResumeSchema.parse(result.resumeData)).toEqual(
				builderCancellationResume('User skipped the question'),
			);
		});

		it('returns a cancellation resume when the answer is explicitly skipped', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				answers: [{ questionId: 'q1', selectedOptions: ['slack'], skipped: true }],
			});

			expect(result).toEqual({
				ok: true,
				resumeData: builderCancellationResume('User skipped the question'),
			});
			if (!result.ok) throw new Error('expected ok result');
			expect(cancellationResumeSchema.parse(result.resumeData)).toEqual(
				builderCancellationResume('User skipped the question'),
			);
		});

		it('returns ok:false when the confirm payload has no answers array and is not a dismissal', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, { approved: true });

			expect(result.ok).toBe(false);
		});
	});

	describe('ask_credential / ask_embedding_credential', () => {
		it('translates a selected credential, validated by askCredentialResumeSchema', () => {
			const result = translateConfirmToBuilderResume(ASK_CREDENTIAL_TOOL_NAME, {
				credentialId: 'cred-1',
				credentialName: 'My Slack account',
			});

			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error('expected ok result');
			expect(askCredentialResumeSchema.parse(result.resumeData)).toEqual({
				credentialId: 'cred-1',
				credentialName: 'My Slack account',
			});
		});

		it('translates a skip into { skipped: true }', () => {
			const result = translateConfirmToBuilderResume(ASK_CREDENTIAL_TOOL_NAME, { skipped: true });

			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error('expected ok result');
			expect(askCredentialResumeSchema.parse(result.resumeData)).toEqual({ skipped: true });
		});

		it('translates a dismissal (approved: false) into { skipped: true }', () => {
			const result = translateConfirmToBuilderResume(ASK_EMBEDDING_CREDENTIAL_TOOL_NAME, {
				approved: false,
			});

			expect(result).toEqual({ ok: true, resumeData: { skipped: true } });
			if (!result.ok) throw new Error('expected ok result');
			expect(askCredentialResumeSchema.parse(result.resumeData)).toEqual({ skipped: true });
		});

		it('returns ok:false when neither a credential nor a skip is present', () => {
			const result = translateConfirmToBuilderResume(ASK_CREDENTIAL_TOOL_NAME, {});

			expect(result.ok).toBe(false);
		});
	});

	describe('configure_channel', () => {
		it('maps an approved confirm to { approved: true }', () => {
			const result = translateConfirmToBuilderResume(CONFIGURE_CHANNEL_TOOL_NAME, {
				approved: true,
			});

			expect(result).toEqual({ ok: true, resumeData: { approved: true } });
		});

		it('maps a dismissal (approved: false) to { approved: false }', () => {
			const result = translateConfirmToBuilderResume(CONFIGURE_CHANNEL_TOOL_NAME, {
				approved: false,
			});

			expect(result).toEqual({ ok: true, resumeData: { approved: false } });
		});

		it('defaults to { approved: false } when the field is absent (matches cli configureChannelResumeSchema)', () => {
			const result = translateConfirmToBuilderResume(CONFIGURE_CHANNEL_TOOL_NAME, {});

			expect(result).toEqual({ ok: true, resumeData: { approved: false } });
		});

		it('takes precedence over the generic approval fallback: never returns ok:false', () => {
			const result = translateConfirmToBuilderResume(CONFIGURE_CHANNEL_TOOL_NAME, {
				approved: 'yes',
			});

			expect(result).toEqual({ ok: true, resumeData: { approved: false } });
		});
	});

	describe('ask_questions', () => {
		it('passes an approved answers confirm payload through unchanged, matching the real FE-flattened shape', () => {
			// VERIFIED FE SHAPE: build the real wire payload via the actual DTO
			// (`questionsConfirmSchema` inside `InstanceAiConfirmRequestDto`), then apply
			// the exact flattening `toConfirmationData` performs server-side (cli
			// instance-ai.service.ts ~L318-329: `{ approved: true, answers: request.answers }`)
			// so this fixture matches what really reaches `ctx.resumeData`.
			const wirePayload = InstanceAiConfirmRequestDto.parse({
				kind: 'questions',
				answers: [
					{ questionId: 'q1', selectedOptions: ['slack'] },
					{ questionId: 'q2', selectedOptions: [], customText: 'Something custom' },
				],
			});
			if (wirePayload.kind !== 'questions') throw new Error('expected questions kind');
			const confirmPayload = { approved: true, answers: wirePayload.answers };

			const result = translateConfirmToBuilderResume(ASK_QUESTIONS_TOOL_NAME, confirmPayload);

			expect(result).toEqual({ ok: true, resumeData: confirmPayload });
		});

		it('passes a dismissal ({ approved: false }, no answers) through unchanged', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTIONS_TOOL_NAME, {
				approved: false,
			});

			expect(result).toEqual({ ok: true, resumeData: { approved: false } });
		});

		it('passes a skipped-answer confirm through unchanged for the cli tool to interpret', () => {
			const wirePayload = InstanceAiConfirmRequestDto.parse({
				kind: 'questions',
				answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }],
			});
			if (wirePayload.kind !== 'questions') throw new Error('expected questions kind');
			const confirmPayload = { approved: true, answers: wirePayload.answers };

			const result = translateConfirmToBuilderResume(ASK_QUESTIONS_TOOL_NAME, confirmPayload);

			expect(result).toEqual({ ok: true, resumeData: confirmPayload });
		});

		it('returns ok:false for a non-record confirm payload', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTIONS_TOOL_NAME, [
				'not',
				'a',
				'record',
			] as unknown as Record<string, unknown>);

			expect(result.ok).toBe(false);
		});

		it('takes precedence over the generic approval fallback: no boolean-approved field required', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTIONS_TOOL_NAME, { answers: [] });

			expect(result).toEqual({ ok: true, resumeData: { answers: [] } });
		});
	});

	describe('unknown tool fallback', () => {
		it('maps { approved } straight through', () => {
			const result = translateConfirmToBuilderResume('some_other_tool', { approved: true });

			expect(result).toEqual({ ok: true, resumeData: { approved: true } });
		});

		it('returns ok:false when approved is missing or not boolean', () => {
			const result = translateConfirmToBuilderResume('some_other_tool', {});

			expect(result.ok).toBe(false);
		});
	});
});

describe('builderCancellationResume', () => {
	it('builds an agent.cancellation resume payload', () => {
		const resume = builderCancellationResume('nope');

		expect(resume).toEqual({
			_type: 'agent.cancellation',
			message: 'nope',
		});
		expect(cancellationResumeSchema.parse(resume)).toEqual(resume);
	});
});
