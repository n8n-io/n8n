import { projectPublicSchema } from '../project-public.dto';

describe('projectPublicSchema', () => {
	const base = {
		id: 'V1kJqMzOxLbZ0aQd',
		name: 'Test Project',
		type: 'team',
		description: null,
		customTelemetryTags: [],
		creatorId: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	};

	test.each([
		{ name: 'an icon with a color', icon: { type: 'emoji', value: '🚀', color: '#ff0000' } },
		{ name: 'an icon without a color', icon: { type: 'icon', value: 'smile' } },
		{ name: 'a type outside the input enum', icon: { type: 'image', value: 'logo.png' } },
		{ name: 'an icon without a value', icon: { type: 'emoji' } },
		{ name: 'no icon', icon: null },
	])('passes $name through unchanged', ({ icon }) => {
		const result = projectPublicSchema.safeParse({ ...base, icon });

		expect(result.success).toBe(true);
		expect(result.data?.icon).toEqual(icon);
	});

	it('rejects an icon that is not an object', () => {
		const result = projectPublicSchema.safeParse({ ...base, icon: '🚀' });

		expect(result.success).toBe(false);
	});
});
