import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	randomCredentialPayloadWithOauthTokenData,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import {
	CredentialDependencyRepository,
	ProjectRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE } from '@/credentials/credential-dependency.service';
import { CredentialsService } from '@/credentials/credentials.service';

import { saveCredential, shareCredentialWithProjects } from '../shared/db/credentials';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import { initCredentialsTypes } from '../shared/utils';

/**
 * Behavioural contract of `CredentialsService.getManyAndCount` against a real database.
 *
 * `GET /rest/credentials` drops `count`, and only internal callers use `includeGlobal`, so
 * these two are only observable here. Every test asserts the returned id set and `count`,
 * which is what a rewrite of the list or count query must keep intact.
 *
 * With `includeGlobal`, globals take part in paging, counting, and filtering like every
 * other credential.
 */

type Options = NonNullable<Parameters<CredentialsService['getManyAndCount']>[1]>;

let service: CredentialsService;

let owner: User;
let admin: User;
let memberA: User;
let memberB: User;

let ownerPersonal: Project;
let adminPersonal: Project;
let memberAPersonal: Project;
let memberBPersonal: Project;
let teamP1: Project;
let teamP2: Project;
let teamP3: Project;

/** Credentials by label; labels sort in the listed order so `sortBy: 'name:asc'` is stable. */
const c: Record<string, CredentialsEntity> = {};

const ids = (credentials: Array<{ id: string }>) => credentials.map((x) => x.id).sort();
const labels = (...names: string[]) => names.map((n) => c[n].id).sort();

async function list(user: User, options: Options = {}) {
	return await service.getManyAndCount(user, options);
}

async function credential(
	label: string,
	target: { project: Project; role?: 'credential:owner' | 'credential:user' },
	payload: Partial<ReturnType<typeof randomCredentialPayload>> = {},
) {
	c[label] = await saveCredential(
		{ ...randomCredentialPayload(), ...payload, name: label },
		{ project: target.project, role: target.role ?? 'credential:owner' },
	);
	return c[label];
}

/**
 * Walks every page of size `take`, checking that pages are disjoint, that `count` is the
 * same on every page, and that the union matches the unpaginated result.
 */
async function expectConsistentPaging(user: User, options: Options, take: number) {
	const full = await list(user, options);
	const seen = new Set<string>();
	for (let skip = 0; skip < full.count; skip += take) {
		const page = await list(user, {
			...options,
			listQueryOptions: { ...options.listQueryOptions, take, skip },
		});
		expect(page.count).toBe(full.count);
		expect(page.credentials.length).toBeLessThanOrEqual(take);
		for (const item of page.credentials) {
			expect(seen.has(item.id)).toBe(false);
			seen.add(item.id);
		}
	}
	expect([...seen].sort()).toEqual(ids(full.credentials));
	expect(full.count).toBe(full.credentials.length);
}

beforeAll(async () => {
	await testDb.init();
	await initCredentialsTypes();
	service = Container.get(CredentialsService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'CredentialDependency',
		'SecretsProviderConnection',
		'SharedCredentials',
		'CredentialsEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);

	owner = await createOwner();
	admin = await createAdmin();
	memberA = await createMember();
	memberB = await createMember();

	const projects = Container.get(ProjectRepository);
	ownerPersonal = await projects.getPersonalProjectForUserOrFail(owner.id);
	adminPersonal = await projects.getPersonalProjectForUserOrFail(admin.id);
	memberAPersonal = await projects.getPersonalProjectForUserOrFail(memberA.id);
	memberBPersonal = await projects.getPersonalProjectForUserOrFail(memberB.id);

	teamP1 = await createTeamProject('P1');
	teamP2 = await createTeamProject('P2');
	teamP3 = await createTeamProject('P3');
	await linkUserToProject(memberA, teamP1, 'project:editor');
	await linkUserToProject(memberA, teamP2, 'project:editor');
	await linkUserToProject(memberB, teamP3, 'project:editor');

	// Owned by projects member A is in
	await credential('c01-p1', { project: teamP1 });
	await credential('c02-p1', { project: teamP1 });
	await credential('c03-p1-ftp', { project: teamP1 }, { type: 'ftp' });
	await credential('c04-p2', { project: teamP2 });
	await credential('c05-p2', { project: teamP2 });
	// Owned by P3 (member A is not in it); c07 is shared into P1, c06 into A's personal project
	await credential('c06-p3', { project: teamP3 });
	await credential('c07-p3', { project: teamP3 });
	await shareCredentialWithProjects(c['c06-p3'], [memberAPersonal]);
	await shareCredentialWithProjects(c['c07-p3'], [teamP1]);
	// Personal credentials
	await credential('c08-a', { project: memberAPersonal });
	await credential('c09-owner', { project: ownerPersonal });
	await credential('c10-b', { project: memberBPersonal });
	// Globals: c11 is owned by P1 (already visible to A), c12/c13 by the owner
	await credential('c11-g-p1', { project: teamP1 }, { isGlobal: true });
	await credential('c12-g', { project: ownerPersonal }, { isGlobal: true });
	await credential('c13-g-ftp', { project: ownerPersonal }, { isGlobal: true, type: 'ftp' });
});

const VISIBLE_TO_A = [
	'c01-p1',
	'c02-p1',
	'c03-p1-ftp',
	'c04-p2',
	'c05-p2',
	'c06-p3',
	'c07-p3',
	'c08-a',
	'c11-g-p1',
];
const ALL = [...VISIBLE_TO_A, 'c09-owner', 'c10-b', 'c12-g', 'c13-g-ftp'];

describe('visibility and count', () => {
	test('member sees credentials of their projects and shares, with matching count', async () => {
		const result = await list(memberA);
		expect(ids(result.credentials)).toEqual(labels(...VISIBLE_TO_A));
		expect(result.count).toBe(VISIBLE_TO_A.length);
	});

	test('owner and admin see everything, with matching count', async () => {
		for (const user of [owner, admin]) {
			const result = await list(user);
			expect(ids(result.credentials)).toEqual(labels(...ALL));
			expect(result.count).toBe(ALL.length);
		}
	});

	test('count is not affected by take or skip', async () => {
		for (const user of [memberA, owner]) {
			const full = await list(user);
			const page = await list(user, { listQueryOptions: { take: 2, skip: 3 } });
			expect(page.credentials).toHaveLength(2);
			expect(page.count).toBe(full.count);
		}
	});

	test('count matches the filtered result for name, type and projectId filters', async () => {
		const cases: Array<{ user: User; filter: Record<string, unknown>; expected: string[] }> = [
			{
				user: memberA,
				filter: { name: 'p1' },
				expected: ['c01-p1', 'c02-p1', 'c03-p1-ftp', 'c11-g-p1'],
			},
			{ user: memberA, filter: { type: 'ftp' }, expected: ['c03-p1-ftp'] },
			{
				user: memberA,
				filter: { projectId: teamP1.id },
				expected: ['c01-p1', 'c02-p1', 'c03-p1-ftp', 'c07-p3', 'c11-g-p1'],
			},
			{
				user: owner,
				filter: { name: 'p1' },
				expected: ['c01-p1', 'c02-p1', 'c03-p1-ftp', 'c11-g-p1'],
			},
			{ user: owner, filter: { type: 'ftp' }, expected: ['c03-p1-ftp', 'c13-g-ftp'] },
			{
				user: owner,
				filter: { projectId: teamP1.id },
				expected: ['c01-p1', 'c02-p1', 'c03-p1-ftp', 'c07-p3', 'c11-g-p1'],
			},
		];
		for (const { user, filter, expected } of cases) {
			const result = await list(user, { listQueryOptions: { filter } });
			expect(ids(result.credentials)).toEqual(labels(...expected));
			expect(result.count).toBe(expected.length);
		}
	});
});

describe('paging', () => {
	test('member pages are disjoint and complete', async () => {
		await expectConsistentPaging(memberA, { listQueryOptions: { sortBy: 'name:asc' } }, 2);
	});

	test('owner pages are disjoint and complete', async () => {
		await expectConsistentPaging(owner, { listQueryOptions: { sortBy: 'name:asc' } }, 4);
	});

	test('sortBy orders the page for member and owner', async () => {
		for (const user of [memberA, owner]) {
			const asc = await list(user, { listQueryOptions: { sortBy: 'name:asc', take: 3 } });
			const desc = await list(user, { listQueryOptions: { sortBy: 'name:desc', take: 3 } });
			expect(asc.credentials.map((x) => x.name)).toEqual(
				[...asc.credentials.map((x) => x.name)].sort(),
			);
			expect(desc.credentials.map((x) => x.name)).toEqual(
				[...desc.credentials.map((x) => x.name)].sort().reverse(),
			);
		}
	});

	test('paging with a filter keeps count equal to the filtered total', async () => {
		await expectConsistentPaging(
			memberA,
			{ listQueryOptions: { sortBy: 'name:asc', filter: { name: 'p1' } } },
			2,
		);
	});

	test('select with take still returns id and omits relations', async () => {
		const result = await list(memberA, {
			listQueryOptions: { select: { name: true }, take: 2 },
		});
		expect(result.credentials).toHaveLength(2);
		for (const item of result.credentials) {
			expect(item.id).toEqual(expect.any(String));
			expect(item.name).toEqual(expect.any(String));
			expect(item).not.toHaveProperty('type');
			expect(item).not.toHaveProperty('shared');
			expect(item).not.toHaveProperty('homeProject');
		}
		expect(result.count).toBe(VISIBLE_TO_A.length);
	});
});

describe('projectId filter for a member', () => {
	test('own personal project returns only owned credentials, not shares into it', async () => {
		const result = await list(memberA, {
			listQueryOptions: { filter: { projectId: memberAPersonal.id } },
		});
		expect(ids(result.credentials)).toEqual(labels('c08-a'));
		expect(result.count).toBe(1);
	});

	test("another user's personal project returns nothing", async () => {
		const result = await list(memberA, {
			listQueryOptions: { filter: { projectId: memberBPersonal.id } },
		});
		expect(result).toEqual({ credentials: [], count: 0 });
	});

	test('a team project the member is not in returns nothing', async () => {
		const result = await list(memberA, {
			listQueryOptions: { filter: { projectId: teamP3.id } },
		});
		expect(result).toEqual({ credentials: [], count: 0 });
	});

	test('a team project the member is in returns owned and shared-in credentials with homeProject', async () => {
		const result = await list(memberA, {
			listQueryOptions: { filter: { projectId: teamP1.id } },
		});
		expect(ids(result.credentials)).toEqual(
			labels('c01-p1', 'c02-p1', 'c03-p1-ftp', 'c07-p3', 'c11-g-p1'),
		);
		const sharedIn = result.credentials.find((x) => x.id === c['c07-p3'].id);
		expect(sharedIn).toMatchObject({
			homeProject: { id: teamP3.id },
			sharedWithProjects: [{ id: teamP1.id }],
		});
	});
});

describe('onlySharedWithMe', () => {
	beforeEach(async () => {
		await shareCredentialWithProjects(c['c05-p2'], [memberAPersonal]);
		await shareCredentialWithProjects(c['c01-p1'], [adminPersonal]);
	});

	test('member gets credentials shared into their personal project as user', async () => {
		const result = await list(memberA, { onlySharedWithMe: true });
		expect(ids(result.credentials)).toEqual(labels('c05-p2', 'c06-p3'));
		expect(result.count).toBe(2);
		for (const item of result.credentials) {
			expect(item).toMatchObject({
				homeProject: expect.objectContaining({ id: expect.any(String) }),
			});
		}
	});

	test('admin gets only credentials shared into their personal project', async () => {
		const result = await list(admin, { onlySharedWithMe: true });
		expect(ids(result.credentials)).toEqual(labels('c01-p1'));
		expect(result.count).toBe(1);
	});

	test('admin with includeGlobal also gets globals, paged and counted', async () => {
		const result = await list(admin, { onlySharedWithMe: true, includeGlobal: true });
		expect(ids(result.credentials)).toEqual(labels('c01-p1', 'c11-g-p1', 'c12-g', 'c13-g-ftp'));
		expect(result.count).toBe(4);
		await expectConsistentPaging(
			admin,
			{ onlySharedWithMe: true, includeGlobal: true, listQueryOptions: { sortBy: 'name:asc' } },
			2,
		);
	});

	test('pages consistently for member and admin', async () => {
		await expectConsistentPaging(
			memberA,
			{ onlySharedWithMe: true, listQueryOptions: { sortBy: 'name:asc' } },
			1,
		);
		await expectConsistentPaging(
			admin,
			{ onlySharedWithMe: true, listQueryOptions: { sortBy: 'name:asc' } },
			1,
		);
	});
});

describe('includeGlobal', () => {
	const VISIBLE_TO_A_WITH_GLOBALS = [...VISIBLE_TO_A, 'c12-g', 'c13-g-ftp'];

	test('member gets globals once, even when already visible through a project', async () => {
		const result = await list(memberA, { includeGlobal: true });
		expect(ids(result.credentials)).toEqual(labels(...VISIBLE_TO_A_WITH_GLOBALS));
		expect(new Set(result.credentials.map((x) => x.id)).size).toBe(result.credentials.length);
	});

	test('owner result is unchanged by includeGlobal', async () => {
		const result = await list(owner, { includeGlobal: true });
		expect(ids(result.credentials)).toEqual(labels(...ALL));
		expect(result.count).toBe(ALL.length);
	});

	test('type filter applies to globals', async () => {
		const result = await list(memberA, {
			includeGlobal: true,
			listQueryOptions: { filter: { type: 'ftp' } },
		});
		expect(ids(result.credentials)).toEqual(labels('c03-p1-ftp', 'c13-g-ftp'));
	});

	test('globals are listed for a project filter regardless of where they are owned', async () => {
		const result = await list(memberA, {
			includeGlobal: true,
			listQueryOptions: { filter: { projectId: teamP2.id } },
		});
		expect(ids(result.credentials)).toEqual(
			labels('c04-p2', 'c05-p2', 'c11-g-p1', 'c12-g', 'c13-g-ftp'),
		);
	});

	test('count includes globals', async () => {
		const result = await list(memberA, { includeGlobal: true });
		expect(result.count).toBe(VISIBLE_TO_A_WITH_GLOBALS.length);
	});

	test('take bounds the page and globals are paged like other credentials', async () => {
		await expectConsistentPaging(
			memberA,
			{ includeGlobal: true, listQueryOptions: { sortBy: 'name:asc' } },
			4,
		);
	});

	test('name filter applies to globals', async () => {
		const result = await list(memberA, {
			includeGlobal: true,
			listQueryOptions: { filter: { name: 'c12' } },
		});
		expect(ids(result.credentials)).toEqual(labels('c12-g'));
		expect(result.count).toBe(1);
	});

	test('select applies to globals', async () => {
		const result = await list(memberA, {
			includeGlobal: true,
			listQueryOptions: { select: { name: true } },
		});
		for (const item of result.credentials) {
			expect(item).not.toHaveProperty('type');
			expect(item).not.toHaveProperty('shared');
		}
	});
});

describe('includeData', () => {
	beforeEach(async () => {
		c['c14-oauth'] = await saveCredential(
			{ ...randomCredentialPayloadWithOauthTokenData(), name: 'c14-oauth' },
			{ project: memberAPersonal, role: 'credential:owner' },
		);
	});

	test('returns scopes on every item and data only where the user may update', async () => {
		const result = await list(memberA, { includeData: true });
		expect(result.count).toBe(VISIBLE_TO_A.length + 1);

		const byId = new Map(result.credentials.map((x) => [x.id, x]));
		for (const item of result.credentials) {
			expect(item).toMatchObject({ scopes: expect.any(Array) });
		}
		// Owned personally and via project:editor: decrypted
		expect(byId.get(c['c08-a'].id)?.data).toMatchObject({ accessToken: expect.any(String) });
		expect(byId.get(c['c01-p1'].id)?.data).toMatchObject({ accessToken: expect.any(String) });
		// Shared in as credential:user: no data
		expect(byId.get(c['c06-p3'].id)?.data).toBeUndefined();
		// oauthTokenData is reduced to a presence flag
		expect(byId.get(c['c14-oauth'].id)?.data).toMatchObject({ oauthTokenData: true });
	});
});

describe('externalSecretsStore filter', () => {
	beforeEach(async () => {
		const connection = await Container.get(SecretsProviderConnectionRepository).save({
			providerKey: 'vault',
			type: 'hashicorpVault',
			encryptedSettings: '',
			isEnabled: false,
		});
		await Container.get(CredentialDependencyRepository).save([
			{
				credentialId: c['c01-p1'].id,
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyId: String(connection.id),
			},
			{
				credentialId: c['c12-g'].id,
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyId: String(connection.id),
			},
		]);
	});

	test('member gets only visible credentials that depend on the store', async () => {
		const result = await list(memberA, { filters: { externalSecretsStore: 'vault' } });
		expect(ids(result.credentials)).toEqual(labels('c01-p1'));
		expect(result.count).toBe(1);
	});

	test('admin gets every credential that depends on the store', async () => {
		const result = await list(admin, { filters: { externalSecretsStore: 'vault' } });
		expect(ids(result.credentials)).toEqual(labels('c01-p1', 'c12-g'));
		expect(result.count).toBe(2);
	});

	test('with includeGlobal a member also gets dependent globals', async () => {
		const result = await list(memberA, {
			includeGlobal: true,
			filters: { externalSecretsStore: 'vault' },
		});
		expect(ids(result.credentials)).toEqual(labels('c01-p1', 'c12-g'));
	});

	test('unknown store returns nothing', async () => {
		const result = await list(memberA, { filters: { externalSecretsStore: 'nope' } });
		expect(result).toEqual({ credentials: [], count: 0 });
	});
});
