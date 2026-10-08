import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME, WAIT_TOOL_NAME } from '@n8n/api-types';

import { makeProposal } from '@/features/ai/instanceAi/components/automation/__tests__/automationProposalFixtures';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '../assistantConfirmation';
import { capabilityDecisionOf, keepsResolvedCard } from '../resolvedCards';
import type { InteractivePayload } from '../types';

const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };
const SAVE = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: false },
};
const DECLINE = { kind: 'capabilityDecision', approved: false };
const TOOL_RESULT = { workflowId: 'wf-1', url: '/workflow/wf-1', active: true, kept: true };

function automationCard(overrides: Partial<InteractivePayload> = {}): InteractivePayload {
	return {
		toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
		toolCallId: 'tc-1',
		resolvedAt: 1,
		resolvedValue: TURN_ON,
		input: {
			requestId: 'r-1',
			message: 'Want "Morning digest" to run automatically?',
			capability: true,
			automationProposal: makeProposal(),
		},
		...overrides,
	} as InteractivePayload;
}

describe('capabilityDecisionOf', () => {
	it.each([TURN_ON, SAVE, DECLINE])('reads a capability answer: %j', (answer) => {
		expect(capabilityDecisionOf(answer)).toEqual(answer);
	});

	it.each([
		['an approval', { kind: 'approval', approved: true }],
		['a tool result', TOOL_RESULT],
		['a declined tool result', { denied: true, message: 'The user declined.' }],
		['an answer without "approved"', { kind: 'capabilityDecision' }],
		['an answer with a value that is not a string or a boolean', { ...SAVE, values: { n: 1 } }],
		['no value', undefined],
		['a string', 'capabilityDecision'],
	])('returns undefined for %s', (_name, value) => {
		expect(capabilityDecisionOf(value)).toBeUndefined();
	});
});

describe('keepsResolvedCard', () => {
	it.each([
		['Turn it on', TURN_ON],
		['Save, but leave it off', SAVE],
		['Not now', DECLINE],
	])('keeps an automation card answered with "%s"', (_name, answer) => {
		expect(keepsResolvedCard(automationCard({ resolvedValue: answer }))).toBe(true);
	});

	it('leaves an open automation card to the rule for open cards', () => {
		expect(keepsResolvedCard(automationCard({ resolvedAt: undefined, runId: 'run-1' }))).toBe(
			false,
		);
	});

	it('hides an automation card that was cancelled after its answer', () => {
		expect(keepsResolvedCard(automationCard({ cancelled: true }))).toBe(false);
	});

	it.each([
		['the tool result, as after a reload', TOOL_RESULT],
		['a declined tool result', { denied: true, message: 'The user declined.' }],
		['an approval body', { kind: 'approval', approved: true }],
		['no answer', undefined],
	])('hides an answered automation card whose value is %s', (_name, value) => {
		expect(keepsResolvedCard(automationCard({ resolvedValue: value }))).toBe(false);
	});

	it('hides an answered capability card that is not an automation card', () => {
		const payload = automationCard({
			input: { requestId: 'r-2', message: 'Run "Morning digest"?', capability: true },
		});

		expect(keepsResolvedCard(payload)).toBe(false);
	});

	it('hides answered approval and question cards, as before', () => {
		const approval: InteractivePayload = {
			toolName: APPROVAL_TOOL_NAME,
			toolCallId: 'tc-2',
			resolvedAt: 1,
			input: { type: 'approval', toolName: 'send_message', args: {} },
			resolvedValue: { approved: true },
		};
		const questions = automationCard({
			input: { requestId: 'r-3', message: 'Which one?', inputType: 'questions', questions: [] },
			resolvedValue: { kind: 'questions', answers: [] },
		});

		expect(keepsResolvedCard(approval)).toBe(false);
		expect(keepsResolvedCard(questions)).toBe(false);
	});
});

describe('keepsResolvedCard properties', () => {
	const decisions = fc
		.record({ approved: fc.boolean(), activate: fc.option(fc.boolean(), { nil: undefined }) })
		.map(({ approved, activate }) => ({
			kind: 'capabilityDecision',
			approved,
			...(activate !== undefined && { values: { target: 'local', activate } }),
		}));

	const otherValues = fc.constantFrom<unknown>(
		undefined,
		null,
		'approve',
		42,
		{},
		{ approved: true },
		{ kind: 'approval', approved: false },
		{ kind: 'questions', answers: [] },
		{ type: 'button', value: 'approve' },
		TOOL_RESULT,
		{ ...TOOL_RESULT, active: false, error: 'Could not publish' },
		{ denied: true, message: 'Blocked by an admin' },
	);

	/** A resolved value, and whether it is a capability answer. */
	const answers = fc.oneof(
		decisions.map((value) => ({ value, isDecision: true })),
		otherValues.map((value) => ({ value, isDecision: false })),
	);

	const state = fc.record({
		toolCallId: fc.constantFrom('tc-1', 'tc-2'),
		runId: fc.option(fc.constant('run-1'), { nil: undefined }),
		resolvedAt: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
		cancelled: fc.option(fc.boolean(), { nil: undefined }),
	});

	const otherAssistantInputs = fc.constantFrom(
		{ requestId: 'r', message: 'Sure?', severity: 'warning' as const },
		{ requestId: 'r', message: 'Run it?', capability: true },
		{ requestId: 'r', message: 'Which?', inputType: 'questions' as const, questions: [] },
		{ requestId: 'r', message: 'Allow?', domainAccess: { url: 'https://a.test', host: 'a.test' } },
	);

	/** Every card without an automation proposal, from every renderer. */
	const cardsWithoutProposal: fc.Arbitrary<InteractivePayload> = fc.oneof(
		fc.tuple(state, otherAssistantInputs, answers).map(([base, input, answer]) => ({
			...base,
			toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
			input,
			resolvedValue: answer.value,
		})),
		fc
			.tuple(state, fc.option(fc.record({ approved: fc.boolean() }), { nil: undefined }))
			.map(([base, resolvedValue]) => ({
				...base,
				toolName: APPROVAL_TOOL_NAME,
				input: { type: 'approval' as const, toolName: 'send_message', args: {} },
				resolvedValue,
			})),
		fc.tuple(state, fc.constantFrom(N8N_CHAT_ACTION_TOOL_NAME, WAIT_TOOL_NAME)).map(
			([base, toolName]) =>
				({
					...base,
					toolName,
					input: { card: { components: [] } },
				}) as InteractivePayload,
		),
	);

	it('never changes the rule for a card without an automation proposal', () => {
		fc.assert(
			fc.property(cardsWithoutProposal, (payload) => {
				expect(keepsResolvedCard(payload)).toBe(false);
			}),
		);
	});

	it('keeps an automation card only when it is answered, not cancelled, with a capability answer', () => {
		fc.assert(
			fc.property(state, answers, (base, answer) => {
				const payload = automationCard({ ...base, resolvedValue: answer.value });
				const expected = Boolean(base.resolvedAt) && base.cancelled !== true && answer.isDecision;

				expect(keepsResolvedCard(payload)).toBe(expected);
			}),
		);
	});
});
