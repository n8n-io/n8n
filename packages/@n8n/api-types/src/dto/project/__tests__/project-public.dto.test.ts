import {
	CreatedProjectPublicDto,
	CreateProjectPublicDto,
	DeleteProjectQueryPublicDto,
	ListProjectsQueryPublicDto,
	ProjectListPublicDto,
	ProjectPublicDto,
	projectPublicSchema,
	UpdateProjectPublicDto,
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

describe('projectPublicSchema', () => {
	test.each([
		{ name: 'an icon with a color', icon: { type: 'emoji', value: '🚀', color: '#ff0000' } },
		{ name: 'an icon without a color', icon: { type: 'icon', value: 'smile' } },
		{ name: 'a type outside the input enum', icon: { type: 'image', value: 'logo.png' } },
		{ name: 'an icon without a value', icon: { type: 'emoji' } },
		{ name: 'no icon', icon: null },
	])('passes $name through unchanged', ({ icon }) => {
		const result = projectPublicSchema.safeParse({ ...project, icon });

		expect(result.success).toBe(true);
		expect(result.data?.icon).toEqual(icon);
	});

	it('rejects an icon that is not an object', () => {
		const result = projectPublicSchema.safeParse({ ...project, icon: '🚀' });

		expect(result.success).toBe(false);
	});
});

describe('ProjectPublicDto', () => {
	test('accepts all the expected fields', () => {
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

	test.each([
		['a Date for createdAt', { createdAt: new Date() }],
		['a non-ISO createdAt', { createdAt: 'yesterday' }],
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

describe('UpdateProjectPublicDto', () => {
	test('accepts a name', () => {
		expect(UpdateProjectPublicDto.safeParse({ name: 'Marketing' }).success).toBe(true);
	});

	test.each([
		['a missing name', {}, ['name']],
		['an empty name', { name: '' }, ['name']],
		['a name over 255 characters', { name: 'a'.repeat(256) }, ['name']],
		['an unknown key', { name: 'Marketing', description: 'd' }, []],
	])('rejects %s', (_label, payload, path) => {
		const result = UpdateProjectPublicDto.safeParse(payload);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(path);
	});

	test.each(['id', 'type'])('rejects %s as read-only', (key) => {
		const result = UpdateProjectPublicDto.safeParse({ name: 'Marketing', [key]: 'x' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({ path: [key], message: 'is read-only' });
	});
});

describe('ListProjectsQueryPublicDto', () => {
	test('exposes limit and cursor and drops offset', () => {
		const result = ListProjectsQueryPublicDto.safeParse({ limit: '5', cursor: 'abc', offset: '3' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 5, cursor: 'abc' });
	});
});

describe('DeleteProjectQueryPublicDto', () => {
	test('accepts an empty query', () => {
		expect(DeleteProjectQueryPublicDto.safeParse({}).success).toBe(true);
	});

	test('rejects any query parameter', () => {
		const result = DeleteProjectQueryPublicDto.safeParse({ transferId: 'abc' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].code).toBe('unrecognized_keys');
	});
});
