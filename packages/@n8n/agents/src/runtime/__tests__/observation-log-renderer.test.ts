import type { ObservationLogEntry, ObservationLogMarker } from '../../types/sdk/observation-log';
import { renderObservationLog } from '../memory/observation-log-renderer';

function entry(overrides: Partial<ObservationLogEntry> = {}): ObservationLogEntry {
	const marker: ObservationLogMarker = overrides.marker ?? 'important';
	return {
		id: overrides.id ?? crypto.randomUUID(),
		observationScopeId: overrides.observationScopeId ?? 'thread-1',
		marker,
		text: overrides.text ?? 'User chose the observation log model.',
		parentId: overrides.parentId ?? null,
		tokenCount: overrides.tokenCount ?? 1,
		status: overrides.status ?? 'active',
		supersededBy: overrides.supersededBy ?? null,
		createdAt: overrides.createdAt ?? new Date(2026, 4, 12, 14, 30),
	};
}

describe('renderObservationLog', () => {
	it('renders active observations as nested marker bullets', () => {
		const parent = entry({
			id: 'parent',
			marker: 'important',
			text: 'User is rebuilding observational memory.',
		});
		const child = entry({
			id: 'child',
			marker: 'completion',
			text: 'Plan 4 was completed.',
			parentId: parent.id,
			createdAt: new Date(2026, 4, 12, 14, 31),
		});
		const dropped = entry({
			id: 'dropped',
			marker: 'info',
			text: 'This should not render.',
			status: 'dropped',
		});

		expect(renderObservationLog([child, dropped, parent])).toBe(
			[
				'<observations>',
				'The following is your memory of this conversation. It accumulates as observations are made. Older entries may have been merged or dropped during periodic restructuring.',
				'Marker legend: CRITICAL = must retain, IMPORTANT = useful continuity, INFO = contextual detail, COMPLETION = completed/resolved.',
				'',
				'* IMPORTANT (14:30) User is rebuilding observational memory.',
				'  * COMPLETION (14:31) Plan 4 was completed.',
				'</observations>',
			].join('\n'),
		);
	});

	it('applies the render token budget to active observations', () => {
		const kept = entry({
			id: 'kept',
			marker: 'critical',
			text: 'User wants the SDK to stay unopinionated.',
			tokenCount: 3,
		});
		const skipped = entry({
			id: 'skipped',
			marker: 'important',
			text: 'This entry no longer fits.',
			tokenCount: 4,
		});

		const rendered = renderObservationLog([kept, skipped], { renderTokenBudget: 3 });

		expect(rendered).toContain('<observations>');
		expect(rendered).toContain('</observations>');
		expect(rendered).toContain('* CRITICAL (14:30) User wants the SDK to stay unopinionated.');
		expect(rendered).not.toContain('This entry no longer fits.');
	});

	it.each([
		[1, ['* CRITICAL (14:32) Recent constraint A.']],
		[2, ['* CRITICAL (14:32) Recent constraint A.', '* CRITICAL (14:32) Recent constraint B.']],
		[
			4,
			[
				'* CRITICAL (14:30) Older constraint.',
				'* CRITICAL (14:32) Recent constraint A.',
				'* CRITICAL (14:32) Recent constraint B.',
				'* IMPORTANT (14:33) Open task.',
			],
		],
		[
			5,
			[
				'* CRITICAL (14:30) Older constraint.',
				'* CRITICAL (14:32) Recent constraint A.',
				'* CRITICAL (14:32) Recent constraint B.',
				'* IMPORTANT (14:33) Open task.',
				'* COMPLETION (14:34) Resolved task.',
			],
		],
	])(
		'selects by priority and recency within a budget of %i, then renders chronologically',
		(budget, expected) => {
			const observations = [
				entry({ marker: 'info', text: 'Recent noise.', createdAt: new Date(2026, 4, 12, 14, 35) }),
				entry({
					marker: 'completion',
					text: 'Resolved task.',
					createdAt: new Date(2026, 4, 12, 14, 34),
				}),
				entry({
					marker: 'important',
					text: 'Open task.',
					createdAt: new Date(2026, 4, 12, 14, 33),
				}),
				entry({
					id: 'b',
					marker: 'critical',
					text: 'Recent constraint B.',
					createdAt: new Date(2026, 4, 12, 14, 32),
				}),
				entry({
					id: 'a',
					marker: 'critical',
					text: 'Recent constraint A.',
					createdAt: new Date(2026, 4, 12, 14, 32),
				}),
				entry({ marker: 'critical', text: 'Older constraint.' }),
			];

			const rendered = renderObservationLog(observations, { renderTokenBudget: budget });

			expect(rendered?.split('\n').filter((line) => line.startsWith('*'))).toEqual(expected);
		},
	);

	it('charges shared ancestors once and renders the full selected tree', () => {
		const root = entry({ id: 'root', marker: 'info', text: 'Root context.', tokenCount: 2 });
		const parent = entry({
			id: 'parent',
			parentId: root.id,
			text: 'Parent context.',
			tokenCount: 2,
			createdAt: new Date(2026, 4, 12, 14, 33),
		});
		const olderChild = entry({
			id: 'older-child',
			parentId: parent.id,
			marker: 'critical',
			text: 'Older finding.',
			createdAt: new Date(2026, 4, 12, 14, 32),
		});
		const newerChild = entry({
			id: 'newer-child',
			parentId: parent.id,
			marker: 'critical',
			text: 'Newer finding.',
			tokenCount: 2,
			createdAt: new Date(2026, 4, 12, 14, 34),
		});
		const earlierRoot = entry({
			id: 'earlier-root',
			text: 'Earlier root.',
			tokenCount: 2,
			createdAt: new Date(2026, 4, 12, 14, 29),
		});
		const noise = entry({
			marker: 'info',
			text: 'Recent noise.',
			createdAt: new Date(2026, 4, 12, 15),
		});

		const rendered = renderObservationLog(
			[newerChild, noise, parent, olderChild, root, earlierRoot],
			{
				renderTokenBudget: 9,
			},
		);

		expect(rendered?.split('\n').filter((line) => line.trimStart().startsWith('*'))).toEqual([
			'* IMPORTANT (14:29) Earlier root.',
			'* INFO (14:30) Root context.',
			'  * IMPORTANT (14:33) Parent context.',
			'    * CRITICAL (14:32) Older finding.',
			'    * CRITICAL (14:34) Newer finding.',
		]);
	});

	it('keeps the full budget available when a child and its ancestors do not fit', () => {
		const parent = entry({ id: 'parent', marker: 'info', text: 'Large context.', tokenCount: 4 });
		const child = entry({ id: 'child', parentId: parent.id, marker: 'critical', tokenCount: 2 });
		const smaller = entry({ id: 'smaller', text: 'Standalone task.', tokenCount: 5 });

		const rendered = renderObservationLog([parent, child, smaller], { renderTokenBudget: 5 });

		expect(rendered).toContain('Standalone task.');
		expect(rendered).not.toContain('Large context.');
		expect(rendered).not.toContain(child.text);
	});

	it('does not repeatedly read token counts for rejected deep ancestor chains', () => {
		let tokenCountReads = 0;
		const observations = Array.from({ length: 128 }, (_, index) => {
			const observation = entry({
				id: `entry-${String(index).padStart(3, '0')}`,
				parentId: index === 0 ? null : `entry-${String(index - 1).padStart(3, '0')}`,
				marker: 'critical',
				createdAt: new Date(2026, 4, 12, 14, 30, index),
			});
			Object.defineProperty(observation, 'tokenCount', {
				get: () => {
					tokenCountReads += 1;
					return 1;
				},
			});
			return observation;
		});

		renderObservationLog(observations, { renderTokenBudget: 64 });

		expect(tokenCountReads).toBeLessThanOrEqual(observations.length * 4);
	});

	it('skips missing and cyclic ancestor chains without consuming the budget', () => {
		const invalid = [
			entry({ id: 'orphan', parentId: 'missing', marker: 'critical' }),
			entry({ id: 'orphan-child', parentId: 'orphan', marker: 'critical' }),
			entry({ id: 'cycle-a', parentId: 'cycle-b', marker: 'critical' }),
			entry({ id: 'cycle-b', parentId: 'cycle-a', marker: 'critical' }),
			entry({ id: 'self-cycle', parentId: 'self-cycle', marker: 'critical' }),
		];
		const valid = entry({
			marker: 'info',
			text: 'Usable context.',
			createdAt: new Date(2026, 4, 12, 15),
		});

		const rendered = renderObservationLog([...invalid, valid], { renderTokenBudget: 1 });

		expect(rendered).toContain('Usable context.');
		expect(rendered).not.toContain(invalid[0].text);
	});

	it('returns null when no active observations fit', () => {
		expect(renderObservationLog([entry({ tokenCount: 2 })], { renderTokenBudget: 1 })).toBeNull();
	});

	it('does not treat an invalid persisted token count as free', () => {
		expect(
			renderObservationLog([entry({ text: 'This entry does not fit.', tokenCount: 0 })], {
				renderTokenBudget: 1,
			}),
		).toBeNull();
	});

	it('does not render a child as a root when its parent is outside the budget', () => {
		const parent = entry({ id: 'parent', tokenCount: 3 });
		const child = entry({
			id: 'child',
			parentId: parent.id,
			text: 'This child would fit alone.',
			tokenCount: 1,
			createdAt: new Date(2026, 4, 12, 14, 31),
		});

		expect(renderObservationLog([parent, child], { renderTokenBudget: 1 })).toBeNull();
	});
});
