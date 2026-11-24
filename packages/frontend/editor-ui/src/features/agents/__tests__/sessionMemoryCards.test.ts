import { describe, expect, it } from 'vitest';
import type { AgentThreadMemoryDto } from '@n8n/api-types';

import type { TimelineItem } from '../session-timeline.types';
import { sessionMemoryCards } from '../utils/sessionMemoryCards';

function memoryItem(partial: Partial<TimelineItem>): TimelineItem {
	return { kind: 'memory', executionId: 'exec-1', timestamp: 0, toolCallId: 'call-1', ...partial };
}

const memory: AgentThreadMemoryDto = {
	recalls: {
		'call-1': [
			{
				entryId: 'entry-1',
				content: 'Alerts go to Slack.',
				status: 'active',
				origin: {
					threadId: 'thread-old',
					canOpen: true,
					evidence: 'send it on Slack',
					createdAt: '2026-09-25T10:00:00.000Z',
				},
			},
			{
				entryId: 'entry-2',
				content: 'Reports are weekly.',
				status: 'deleted',
				origin: {
					threadId: 'thread-1',
					canOpen: true,
					evidence: 'weekly',
					createdAt: '2026-09-26T10:00:00.000Z',
				},
			},
			{ entryId: 'entry-3', content: 'Private fact.', status: 'active' },
		],
	},
	flags: {
		'call-1': {
			captureId: 'capture-1',
			content: 'Funnel data is in Hex.',
			evidence: 'from Hex',
			status: 'pending',
		},
	},
};

describe('sessionMemoryCards', () => {
	it('maps recalled entries with their origin and delete target', () => {
		expect(sessionMemoryCards(memoryItem({ memoryAction: 'recall' }), memory, 'thread-1')).toEqual([
			{
				key: 'entry-1',
				content: 'Alerts go to Slack.',
				evidence: 'send it on Slack',
				origin: {
					kind: 'previous-session',
					createdAt: '2026-09-25T10:00:00.000Z',
					threadId: 'thread-old',
				},
				status: 'active',
				deleteTarget: { type: 'entry', id: 'entry-1' },
			},
			{
				key: 'entry-2',
				content: 'Reports are weekly.',
				evidence: 'weekly',
				origin: { kind: 'this-session', createdAt: '2026-09-26T10:00:00.000Z' },
				status: 'deleted',
			},
			{
				key: 'entry-3',
				content: 'Private fact.',
				evidence: undefined,
				origin: undefined,
				status: 'active',
				deleteTarget: { type: 'entry', id: 'entry-3' },
			},
		]);
	});

	it('omits the session link when the viewer cannot open it', () => {
		const hidden: AgentThreadMemoryDto = {
			recalls: {
				'call-1': [
					{
						...memory.recalls['call-1'][0],
						origin: { ...memory.recalls['call-1'][0].origin!, canOpen: false },
					},
				],
			},
			flags: {},
		};

		expect(
			sessionMemoryCards(memoryItem({ memoryAction: 'recall' }), hidden, 'thread-1')[0].origin,
		).toEqual({ kind: 'previous-session', createdAt: '2026-09-25T10:00:00.000Z' });
	});

	it.each([
		['pending', true],
		['stored', true],
		['replaced', false],
		['failed', false],
		['deleted', false],
	] as const)('maps a %s flag', (status, deletable) => {
		const flags = { 'call-1': { ...memory.flags['call-1'], status } };
		const [card] = sessionMemoryCards(
			memoryItem({ memoryAction: 'flag' }),
			{ recalls: {}, flags },
			'thread-1',
		);

		expect(card).toMatchObject({
			content: 'Funnel data is in Hex.',
			status,
			origin: { kind: 'this-run' },
		});
		expect(card.deleteTarget).toEqual(deletable ? { type: 'capture', id: 'capture-1' } : undefined);
	});

	it('shows the model-facing text of traces recorded before memory ids were traced', () => {
		const recall = memoryItem({
			memoryAction: 'recall',
			toolOutput: { entries: [{ content: 'Prior/historical entry: Alerts go to Slack.' }] },
		});
		const flag = memoryItem({
			memoryAction: 'flag',
			toolInput: { content: 'Funnel data is in Hex.', evidence: 'from Hex' },
		});

		expect(sessionMemoryCards(recall, undefined, 'thread-1')).toEqual([
			{ key: 'legacy-0', content: 'Alerts go to Slack.' },
		]);
		expect(sessionMemoryCards(flag, { recalls: {}, flags: {} }, 'thread-1')).toEqual([
			{
				key: 'legacy',
				content: 'Funnel data is in Hex.',
				evidence: 'from Hex',
				origin: { kind: 'this-run' },
			},
		]);
	});
});
