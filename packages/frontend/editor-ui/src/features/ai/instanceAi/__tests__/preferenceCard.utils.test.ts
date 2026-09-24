import { describe, it, expect } from 'vitest';
import type { InstanceAiToolCallState } from '@n8n/api-types';

import {
	isPreferenceCardEvent,
	isPreferenceWriteOutcome,
	resolvePreferenceCard,
	resolvePreferenceRejection,
} from '../preferenceCard.utils';

describe('resolvePreferenceCard', () => {
	const saved = {
		ok: true,
		preference: { id: 'pref-1', content: 'Keep replies short.', scope: 'user' },
	};
	const toolCall = (overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState => ({
		toolCallId: 'tc-1',
		toolName: 'save_user_preference',
		args: {},
		isLoading: false,
		result: saved,
		...overrides,
	});

	it('resolves the save tool result to a saved card', () => {
		expect(resolvePreferenceCard(toolCall({}))).toEqual({
			state: 'saved',
			preferenceId: 'pref-1',
			content: 'Keep replies short.',
		});
	});

	it('ignores another tool that answers in the same shape', () => {
		expect(resolvePreferenceCard(toolCall({ toolName: 'workflows' }))).toBeNull();
	});

	it('ignores a refusal and a call that is still running', () => {
		expect(
			resolvePreferenceCard(toolCall({ result: { ok: false, reason: 'too_long' } })),
		).toBeNull();
		expect(resolvePreferenceCard(toolCall({ result: undefined, isLoading: true }))).toBeNull();
	});

	it('lets a later fact override the state and the text', () => {
		expect(
			resolvePreferenceCard(
				toolCall({ preferenceCard: { state: 'edited', content: 'Keep replies brief.' } }),
			),
		).toEqual({ state: 'edited', preferenceId: 'pref-1', content: 'Keep replies brief.' });
		expect(resolvePreferenceCard(toolCall({ preferenceCard: { state: 'undone' } }))).toEqual({
			state: 'undone',
			preferenceId: 'pref-1',
			content: 'Keep replies short.',
		});
	});
});

describe('resolvePreferenceRejection', () => {
	const toolCall = (overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState => ({
		toolCallId: 'tc-1',
		toolName: 'save_user_preference',
		args: { content: '  Keep replies short.  ', scope: 'user' },
		isLoading: false,
		result: { ok: false, reason: 'duplicate', message: 'Already saved.' },
		...overrides,
	});

	it('resolves a refusal to its reason, the server message and the attempted text', () => {
		expect(resolvePreferenceRejection(toolCall({}))).toEqual({
			reason: 'duplicate',
			message: 'Already saved.',
			content: 'Keep replies short.',
		});
	});

	it('accepts a reason the frontend does not know, so nothing is swallowed', () => {
		expect(
			resolvePreferenceRejection(toolCall({ result: { ok: false, reason: 'new_rule' } })),
		).toMatchObject({ reason: 'new_rule', message: undefined });
	});

	it('leaves the message out when the result has none or a blank one', () => {
		expect(
			resolvePreferenceRejection(
				toolCall({ result: { ok: false, reason: 'failed', message: ' ' } }),
			),
		).toEqual({ reason: 'failed', message: undefined, content: 'Keep replies short.' });
	});

	it('leaves the text out when the call arguments carry none', () => {
		expect(resolvePreferenceRejection(toolCall({ args: {} }))).toEqual({
			reason: 'duplicate',
			message: 'Already saved.',
			content: undefined,
		});
	});

	it('treats a tool that threw as failed, without exposing the error text', () => {
		expect(resolvePreferenceRejection(toolCall({ result: undefined, error: 'boom' }))).toEqual({
			reason: 'failed',
			content: 'Keep replies short.',
		});
	});

	it('treats a call the run ended mid-flight as unconfirmed, not as failed', () => {
		expect(
			resolvePreferenceRejection(
				toolCall({
					result: undefined,
					error: 'Interrupted by a process restart',
					interrupted: true,
				}),
			),
		).toEqual({ reason: 'interrupted', content: 'Keep replies short.' });
	});

	it.each([
		[
			'a saved result',
			{ result: { ok: true, preference: { id: 'p', content: 'x', scope: 'user' } } },
		],
		['a call still running', { result: undefined, isLoading: true }],
		['another tool', { toolName: 'workflows' }],
		['a result without a reason', { result: { ok: false } }],
	] as const)('returns null for %s', (_label, overrides) => {
		expect(resolvePreferenceRejection(toolCall(overrides))).toBeNull();
	});
});

describe('isPreferenceWriteOutcome', () => {
	const toolCall = (overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState => ({
		toolCallId: 'tc-1',
		toolName: 'save_user_preference',
		args: {},
		isLoading: false,
		...overrides,
	});

	it.each([
		[
			'a saved result',
			{ result: { ok: true, preference: { id: 'p', content: 'x', scope: 'user' } } },
		],
		['a refusal', { result: { ok: false, reason: 'too_long' } }],
		['a thrown tool', { error: 'boom' }],
		['an interrupted call', { error: 'Interrupted', interrupted: true }],
	] as const)('is true for %s', (_label, overrides) => {
		expect(isPreferenceWriteOutcome(toolCall(overrides))).toBe(true);
	});

	it.each([
		['a call still running', { isLoading: true }],
		['another tool', { toolName: 'workflows', result: { ok: false, reason: 'x' } }],
		['no result and no error', {}],
	] as const)('is false for %s', (_label, overrides) => {
		expect(isPreferenceWriteOutcome(toolCall(overrides))).toBe(false);
	});
});

describe('isPreferenceCardEvent', () => {
	const fact = {
		type: 'preference-card',
		runId: 'run-1',
		agentId: 'orchestrator-run-1',
		payload: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' },
	};

	it('accepts the fact the card endpoints return, with or without a publish timestamp', () => {
		expect(isPreferenceCardEvent(fact)).toBe(true);
		expect(isPreferenceCardEvent({ ...fact, ts: 1 })).toBe(true);
		expect(
			isPreferenceCardEvent({
				...fact,
				payload: { ...fact.payload, state: 'edited', content: 'Keep replies brief.' },
			}),
		).toBe(true);
	});

	it.each([
		['undefined', undefined],
		['null', null],
		['an empty object', {}],
		['another event type', { ...fact, type: 'tool-result', payload: { toolCallId: 'tc-1' } }],
		['a fact with an unknown state', { ...fact, payload: { ...fact.payload, state: 'saved' } }],
		['a fact without a payload', { type: 'preference-card', runId: 'run-1', agentId: 'a' }],
	])('rejects %s', (_label, value) => {
		expect(isPreferenceCardEvent(value)).toBe(false);
	});
});
