import { serializedProjectSchema } from '../project.schema';

describe('serializedProjectSchema', () => {
	it('accepts a minimal project with only id and name', () => {
		const project = { id: 'proj-1', name: 'billing' };

		expect(() => serializedProjectSchema.parse(project)).not.toThrow();
	});

	it('accepts customTelemetryTags when present', () => {
		const project = {
			id: 'proj-1',
			name: 'billing',
			customTelemetryTags: [
				{ key: 'team', value: 'ligo' },
				{ key: 'env', value: 'prod' },
			],
		};

		const parsed = serializedProjectSchema.parse(project);
		expect(parsed.customTelemetryTags).toEqual([
			{ key: 'team', value: 'ligo' },
			{ key: 'env', value: 'prod' },
		]);
	});

	it('tolerates a package with no customTelemetryTags field (older packages)', () => {
		const project = { id: 'proj-1', name: 'billing', description: 'A project' };

		const parsed = serializedProjectSchema.parse(project);
		expect(parsed.customTelemetryTags).toBeUndefined();
	});

	it('rejects an empty id', () => {
		const project = { id: '', name: 'billing' };

		expect(() => serializedProjectSchema.parse(project)).toThrow();
	});
});
