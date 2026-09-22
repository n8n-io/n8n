import { describe, it, expect } from 'vitest';

import { isPreferenceCardEvent } from '../preferenceCard.utils';

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
