import {
	CreatedProjectPublicDto,
	CreateProjectPublicDto,
	ListProjectsQueryPublicDto,
	ProjectListPublicDto,
	ProjectPublicDto,
} from '../project-public.dto';

const project = {
	id: 'VmwOO9HeTEj20kxM',
	name: 'Marketing',
	type: 'team',
	icon: { type: 'icon', value: 'layers' },
	description: 'Workflows the marketing team owns.',
	customTelemetryTags: [{ key: 'team', value: 'marketing' }],
	creatorId: 'f9a2cbb8-0b1e-4b64-9c1c-0d5f5f1f2a3b',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProjectPublicDto', () => {
	test('accepts the nine fields the list returns', () => {
		expect(ProjectPublicDto.safeParse(project).success).toBe(true);
	});

	test('accepts a personal project with null icon, description and creator', () => {
		const result = ProjectPublicDto.safeParse({
			...project,
			type: 'personal',
			icon: null,
			description: null,
			creatorId: null,
			customTelemetryTags: [],
		});

		expect(result.success).toBe(true);
	});

	test('accepts an unknown project type', () => {
		expect(ProjectPublicDto.safeParse({ ...project, type: 'future' }).success).toBe(true);
	});

	test('strips a field the schema does not name', () => {
		const result = ProjectPublicDto.safeParse({ ...project, projectRelations: [] });

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('projectRelations');
	});

	test.each([
		['a Date for createdAt', { createdAt: new Date() }],
		['a non-ISO createdAt', { createdAt: 'yesterday' }],
		['a missing name', { name: undefined }],
	])('rejects %s', (_label, override) => {
		expect(ProjectPublicDto.safeParse({ ...project, ...override }).success).toBe(false);
	});
});

describe('ProjectListPublicDto', () => {
	test('accepts a page with a next cursor', () => {
		const result = ProjectListPublicDto.safeParse({ data: [project], nextCursor: 'abc' });

		expect(result.success).toBe(true);
	});

	test('accepts the last page', () => {
		expect(ProjectListPublicDto.safeParse({ data: [], nextCursor: null }).success).toBe(true);
	});

	test('rejects a missing nextCursor', () => {
		expect(ProjectListPublicDto.safeParse({ data: [] }).success).toBe(false);
	});
});

describe('CreatedProjectPublicDto', () => {
	test('accepts the project plus role and scopes', () => {
		const result = CreatedProjectPublicDto.safeParse({
			...project,
			role: 'project:admin',
			scopes: ['project:read', 'workflow:create'],
		});

		expect(result.success).toBe(true);
	});

	test('rejects a missing role', () => {
		expect(CreatedProjectPublicDto.safeParse({ ...project, scopes: [] }).success).toBe(false);
	});
});

describe('CreateProjectPublicDto', () => {
	test('accepts a name', () => {
		expect(CreateProjectPublicDto.safeParse({ name: 'Marketing' }).success).toBe(true);
	});

	test.each([
		['a missing name', {}, ['name']],
		['an empty name', { name: '' }, ['name']],
		['a name over 255 characters', { name: 'a'.repeat(256) }, ['name']],
		['an unknown key', { name: 'Marketing', icon: { type: 'icon', value: 'layers' } }, []],
	])('rejects %s', (_label, payload, path) => {
		const result = CreateProjectPublicDto.safeParse(payload);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(path);
	});

	test.each(['id', 'type'])('rejects %s as read-only', (key) => {
		const result = CreateProjectPublicDto.safeParse({ name: 'Marketing', [key]: 'x' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({ path: [key], message: 'is read-only' });
	});
});

describe('ListProjectsQueryPublicDto', () => {
	test('defaults limit to 100', () => {
		const result = ListProjectsQueryPublicDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 100 });
	});

	test('clamps limit to 250', () => {
		const result = ListProjectsQueryPublicDto.safeParse({ limit: '300' });

		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(250);
	});

	test('keeps the cursor', () => {
		const result = ListProjectsQueryPublicDto.safeParse({ cursor: 'abc' });

		expect(result.data?.cursor).toBe('abc');
	});

	test('rejects a non-numeric limit', () => {
		expect(ListProjectsQueryPublicDto.safeParse({ limit: 'abc' }).success).toBe(false);
	});
});
