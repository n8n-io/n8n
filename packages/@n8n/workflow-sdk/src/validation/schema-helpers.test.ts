import { resourceMapperValueSchema } from './schema-helpers';

function hasIssueAtPath(
	issues: Array<{ path: Array<string | number>; unionErrors?: unknown }>,
	path: string,
) {
	for (const issue of issues) {
		if (issue.path.join('.') === path) return true;
		if (Array.isArray(issue.unionErrors)) {
			const nestedIssues = issue.unionErrors.flatMap((error) =>
				typeof error === 'object' && error !== null && 'issues' in error
					? ((error as { issues: Array<{ path: Array<string | number>; unionErrors?: unknown }> })
							.issues ?? [])
					: [],
			);
			if (hasIssueAtPath(nestedIssues, path)) return true;
		}
	}
	return false;
}

describe('resourceMapperValueSchema', () => {
	it('requires schema for defineBelow mapping mode', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'defineBelow',
			value: {
				name: '={{ $json.name }}',
				email: '={{ $json.email }}',
			},
		});

		expect(result.success).toBe(false);
		expect(hasIssueAtPath(result.error?.issues ?? [], 'schema')).toBe(true);
	});

	it('accepts defineBelow when schema is present', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'defineBelow',
			value: {
				name: '={{ $json.name }}',
				email: '={{ $json.email }}',
			},
			schema: [
				{ id: 'name', displayName: 'Name', type: 'string', required: false },
				{ id: 'email', displayName: 'Email', type: 'string', required: false },
			],
		});

		expect(result.success).toBe(true);
	});

	it('accepts autoMapInputData without schema', () => {
		const result = resourceMapperValueSchema.safeParse({
			mappingMode: 'autoMapInputData',
			value: null,
		});

		expect(result.success).toBe(true);
	});

	it('accepts expression values', () => {
		const result = resourceMapperValueSchema.safeParse('={{ $json.columns }}');

		expect(result.success).toBe(true);
	});
});
