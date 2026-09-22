import { describe, it, expect } from 'vitest';
import type { InstanceAiToolCallState } from '@n8n/api-types';

import { isPreferenceCardEvent, resolvePreferenceCard } from '../preferenceCard.utils';

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
