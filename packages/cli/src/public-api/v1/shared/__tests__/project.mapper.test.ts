import type { Project } from '@n8n/db';

import { toPublicProject } from '../project.mapper';

describe('toPublicProject', () => {
	const base = {
		id: 'V1kJqMzOxLbZ0aQd',
		name: 'Test Project',
		type: 'team' as const,
		icon: null,
		description: null,
		customTelemetryTags: [],
		creatorId: null,
	};

	it('serialises entity dates to ISO strings', () => {
		const project = {
			...base,
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		} as unknown as Project;

		expect(toPublicProject(project)).toEqual({
			...base,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
		});
	});

	it('keeps dates that a cache round-trip already turned into strings', () => {
		const project = {
			...base,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
		} as unknown as Project;

		expect(toPublicProject(project)).toEqual({
			...base,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
		});
	});
});
