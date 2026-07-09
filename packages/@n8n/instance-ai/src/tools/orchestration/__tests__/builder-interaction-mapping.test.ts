import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	credentialRequestSchema,
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

		it('returns ok:false when approved but no answer values are present', () => {
			const result = translateConfirmToBuilderResume(ASK_QUESTION_TOOL_NAME, {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: [] }],
			});

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
		});

		it('returns ok:false when neither a credential nor a skip is present', () => {
			const result = translateConfirmToBuilderResume(ASK_CREDENTIAL_TOOL_NAME, {});

			expect(result.ok).toBe(false);
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
		expect(builderCancellationResume('nope')).toEqual({
			_type: 'agent.cancellation',
			message: 'nope',
		});
	});
});
