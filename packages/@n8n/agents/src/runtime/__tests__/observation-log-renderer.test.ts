import type { ObservationLogEntry, ObservationLogMarker } from '../../types/sdk/observation-log';
import { renderObservationLog } from '../observation-log-renderer';

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
				'## Memory',
				'',
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

	it('returns null when no active observations fit', () => {
		expect(renderObservationLog([entry({ tokenCount: 2 })], { renderTokenBudget: 1 })).toBeNull();
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
