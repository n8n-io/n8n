import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import { CacheService, EventService } from '@n8n/backend-services';
import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	trustedSourceConfigSchemaFor,
	type ManagedBy,
	type Result,
	type RoleMappingRule,
	type TrustedSource,
	type TrustedSourceIdentity,
	type Verified,
} from '@n8n/inbound-auth';
import type { ResourceGrant, SecurityContext } from '@n8n/permissions';
import { DataSource, type Repository } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { TrustedSourceIdentityEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source-identity.entity';
import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { TrustedSourceIdentityRepository } from '@/modules/inbound-auth-core/database/repositories/trusted-source-identity.repository';
import { TrustedSourceIdentityService } from '@/modules/inbound-auth-core/identity/trusted-source-identity.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { RoleResolverService } from '@/modules/provisioning.ee/role-resolver.service.ee';
import { UserService } from '@/services/user.service';

import { createAdmin, createMember, createOwner, createUser } from '../shared/db/users';

const RESOURCE = 'https://n8n.example/mcp';

let cipher: Cipher;
let cacheService: CacheService;
let rows: Repository<TrustedSourceEntity>;
let bindings: Repository<TrustedSourceIdentityEntity>;
let users: UserRepository;
let service: TrustedSourceIdentityService;
let emit: ReturnType<typeof spyOnEmit>;

const spyOnEmit = () => vi.spyOn(Container.get(EventService), 'emit');

let seeded = 0;

async function seedSource(
	identity: Partial<TrustedSourceIdentity> = {},
	managedBy: ManagedBy = 'admin',
): Promise<TrustedSource> {
	seeded += 1;
	const config = trustedSourceConfigSchemaFor(managedBy).parse({
		version: 1,
		authentication: {
			type: 'oauth2',
			...(managedBy === 'system' && { keys: { kind: 'local-keystore' } }),
		},
		surfaces: { 'instance-mcp': {} },
		identity,
	});
	const row = await rows.save(
		rows.create({
			name: `source-${seeded}`,
			type: 'oauth2',
			issuer: `https://issuer-${seeded}.example`,
			managedBy,
			status: 'healthy',
			lastError: null,
			lastCheckedAt: new Date(),
			configVersion: 1,
			config: await cipher.encryptV2(config),
			metadata: null,
			discoveryClaimToken: null,
			discoveryClaimedAt: null,
		}),
	);
	const source = await Container.get(TrustedSourceDbStore).getById(row.id);
	if (!source) throw new Error(`source ${row.id} did not load`);
	return source;
}

const verified = (
	source: TrustedSource,
	claims: Record<string, unknown>,
	grant?: ResourceGrant,
): Verified => ({
	surface: 'instance-mcp',
	resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
	...(grant !== undefined && { grant }),
	request: { method: 'POST', url: '/mcp', ip: '203.0.113.7' },
	receivedAt: new Date(),
	credentialKind: 'bearer',
	source,
	claims,
	expiresAt: new Date(Date.now() + 3600_000),
});

async function bind(
	source: TrustedSource,
	subject: string,
	userId: string,
	overrides: Partial<
		Pick<TrustedSourceIdentityEntity, 'status' | 'provenance' | 'lastSeenAt'>
	> = {},
) {
	return await bindings.save(
		bindings.create({
			sourceId: source.id,
			subject,
			userId,
			provenance: 'admin',
			status: 'active',
			lastSeenAt: null,
			...overrides,
		}),
	);
}

const readBinding = async (source: TrustedSource, subject: string) =>
	await bindings.findOneByOrFail({ sourceId: source.id, subject });

function expectOk(result: Result<SecurityContext>): SecurityContext {
	if (!result.ok) throw new Error(`expected ok, got reject '${result.reason}'`);
	return result.value;
}

const rejectReason = (result: Result<SecurityContext>) => (result.ok ? 'ok' : result.reason);

/** Whole seconds: SQLite stores the column without sub-second precision. */
const secondsAgo = (seconds: number) => new Date(Math.floor(Date.now() / 1000 - seconds) * 1000);

beforeAll(async () => {
	await testModules.loadModules(['inbound-auth-core']);
	await testDb.init();

	cipher = Container.get(Cipher);
	cacheService = Container.get(CacheService);
	await cacheService.init();
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	bindings = Container.get(DataSource).getRepository(TrustedSourceIdentityEntity);
	users = Container.get(UserRepository);
	service = Container.get(TrustedSourceIdentityService);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceIdentityEntity', 'TrustedSourceEntity', 'User']);
	await cacheService.reset();
	emit = spyOnEmit();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('TrustedSourceIdentityService (integration)', () => {
	describe('binding mode', () => {
		it('resolves an active binding to a security context without the credential', async () => {
			const source = await seedSource();
			const member = await createMember();
			await bind(source, 'alice', member.id);
			const grant: ResourceGrant = { audiences: [RESOURCE] };
			const input = verified(
				source,
				{ sub: 'alice', client_id: 'cli', scope: 'read write', acr: 'urn:mfa' },
				grant,
			);

			const context = expectOk(await service.identify(input));

			expect(context).toMatchObject({
				subject: { id: member.id, type: 'human' },
				authMethod: 'oauth-access-token',
				subjectClaim: { sourceId: source.id, issuer: source.issuer, subject: 'alice' },
				clientId: 'cli',
				tokenScopes: ['read', 'write'],
				resource: input.resource,
				grant,
				assurance: { acr: 'urn:mfa' },
			});
			// Key checks, not substring checks: role descriptions and scope slugs contain these words.
			for (const key of [
				'actor',
				'actorClaim',
				'subIdentityId',
				'credential',
				'request',
				'claims',
			]) {
				expect(context).not.toHaveProperty(key);
			}
		});

		it.each(['suspended', 'revoked'] as const)(
			'rejects a %s binding before it reads the user and leaves lastSeenAt unchanged',
			async (status) => {
				const source = await seedSource();
				const member = await createMember();
				const lastSeenAt = secondsAgo(7 * 86400);
				await bind(source, 'alice', member.id, { status, lastSeenAt });

				const result = await service.identify(verified(source, { sub: 'alice' }));

				expect(rejectReason(result)).toBe('binding-inactive');
				expect((await readBinding(source, 'alice')).lastSeenAt?.getTime()).toBe(
					lastSeenAt.getTime(),
				);
			},
		);

		it('reports the binding status before the user status', async () => {
			const source = await seedSource();
			const disabled = await createUser({ disabled: true });
			await bind(source, 'alice', disabled.id, { status: 'suspended' });

			const result = await service.identify(verified(source, { sub: 'alice' }));

			expect(rejectReason(result)).toBe('binding-inactive');
		});

		it('rejects a binding to a disabled user', async () => {
			const source = await seedSource();
			const disabled = await createUser({ disabled: true });
			await bind(source, 'alice', disabled.id);

			const result = await service.identify(verified(source, { sub: 'alice' }));

			expect(rejectReason(result)).toBe('user-disabled');
		});

		it.each([
			['null', null],
			['older than one day', secondsAgo(2 * 86400)],
		])('stamps lastSeenAt on resolve when it is %s', async (_label, lastSeenAt) => {
			const source = await seedSource();
			const member = await createMember();
			await bind(source, 'alice', member.id, { lastSeenAt });

			expectOk(await service.identify(verified(source, { sub: 'alice' })));

			const stamped = (await readBinding(source, 'alice')).lastSeenAt;
			expect(stamped).not.toBeNull();
			expect(Math.abs(Date.now() - (stamped?.getTime() ?? 0))).toBeLessThan(5000);
		});

		it('leaves lastSeenAt unchanged when it was stamped today', async () => {
			const source = await seedSource();
			const member = await createMember();
			const lastSeenAt = secondsAgo(3600);
			await bind(source, 'alice', member.id, { lastSeenAt });

			expectOk(await service.identify(verified(source, { sub: 'alice' })));

			expect((await readBinding(source, 'alice')).lastSeenAt?.getTime()).toBe(lastSeenAt.getTime());
		});

		it('resolves two subjects bound to the same user to that user', async () => {
			const source = await seedSource();
			const member = await createMember();
			await bind(source, 'alice', member.id);
			await bind(source, 'alice-2', member.id);

			const first = expectOk(await service.identify(verified(source, { sub: 'alice' })));
			const second = expectOk(await service.identify(verified(source, { sub: 'alice-2' })));

			expect(first.subject.id).toBe(member.id);
			expect(second.subject.id).toBe(member.id);
			expect(first.subjectClaim?.subject).toBe('alice');
			expect(second.subjectClaim?.subject).toBe('alice-2');
		});

		it('refuses a subject without a binding or an email and writes no row', async () => {
			const source = await seedSource();
			await createMember();

			const result = await service.identify(verified(source, { sub: 'alice' }));

			// Without an email there is nothing to link, so the request ends at provisioning.
			expect(rejectReason(result)).toBe('provision-refused');
			expect(await bindings.count()).toBe(0);
		});

		it('rejects claims without the subject claim', async () => {
			const source = await seedSource();

			const result = await service.identify(verified(source, { email: 'alice@example.com' }));

			expect(rejectReason(result)).toBe('unknown-subject');
		});
	});

	describe('n8n-user-id mode on a system-managed source', () => {
		it('resolves the subject as a user id, owner included, without a binding row', async () => {
			const source = await seedSource({ subject: 'n8n-user-id' }, 'system');
			const owner = await createOwner();

			const context = expectOk(await service.identify(verified(source, { sub: owner.id })));

			expect(context.subject.id).toBe(owner.id);
			expect(context.subjectClaim).toEqual({
				sourceId: source.id,
				issuer: source.issuer,
				subject: owner.id,
			});
			expect(await bindings.count()).toBe(0);
		});

		it('rejects a subject that is not a user id', async () => {
			const source = await seedSource({ subject: 'n8n-user-id' }, 'system');

			const result = await service.identify(verified(source, { sub: randomUUID() }));

			expect(rejectReason(result)).toBe('unknown-subject');
			expect(await bindings.count()).toBe(0);
		});

		it('rejects the id of a disabled user', async () => {
			const source = await seedSource({ subject: 'n8n-user-id' }, 'system');
			const disabled = await createUser({ disabled: true });

			const result = await service.identify(verified(source, { sub: disabled.id }));

			expect(rejectReason(result)).toBe('user-disabled');
			expect(await bindings.count()).toBe(0);
		});
	});

	describe('link by email', () => {
		const email = 'alice@example.com';

		it('links a verified email to the matching member and emits the linked event', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			const member = await createUser({ email });

			const context = expectOk(
				await service.identify(verified(source, { sub: 'alice', email, email_verified: true })),
			);

			expect(context.subject.id).toBe(member.id);
			expect(await readBinding(source, 'alice')).toMatchObject({
				provenance: 'claim-match',
				status: 'active',
				userId: member.id,
			});
			expect(emit).toHaveBeenCalledWith('trusted-source-identity-linked', {
				userId: member.id,
				sourceId: source.id,
				issuer: source.issuer,
				subject: 'alice',
				provenance: 'claim-match',
			});
		});

		it('skips the lookup for an unverified email under verified-only and falls through to provisioning', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			await createUser({ email });

			const result = await service.identify(
				verified(source, { sub: 'alice', email, email_verified: false }),
			);

			expect(rejectReason(result)).toBe('provision-refused');
			expect(await bindings.count()).toBe(0);
			expect(emit).not.toHaveBeenCalledWith('trusted-source-identity-linked', expect.anything());
		});

		it('links an unverified email when linkByEmail is any', async () => {
			const source = await seedSource({ linkByEmail: 'any' });
			const member = await createUser({ email });

			const context = expectOk(
				await service.identify(verified(source, { sub: 'alice', email, email_verified: false })),
			);

			expect(context.subject.id).toBe(member.id);
			expect((await readBinding(source, 'alice')).userId).toBe(member.id);
		});

		it('refuses to link when linkByEmail is off', async () => {
			const source = await seedSource({ linkByEmail: 'off' });
			await createUser({ email });

			const result = await service.identify(
				verified(source, { sub: 'alice', email, email_verified: true }),
			);

			expect(rejectReason(result)).toBe('link-refused');
			expect(await bindings.count()).toBe(0);
		});

		it('refuses to link the instance owner', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			const owner = await createOwner();

			const result = await service.identify(
				verified(source, { sub: 'alice', email: owner.email, email_verified: true }),
			);

			expect(rejectReason(result)).toBe('link-refused');
			expect(await bindings.count()).toBe(0);
		});

		it('rejects a match on a disabled user and writes no row', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			await createUser({ disabled: true, email });

			const result = await service.identify(
				verified(source, { sub: 'alice', email, email_verified: true }),
			);

			expect(rejectReason(result)).toBe('user-disabled');
			expect(await bindings.count()).toBe(0);
		});

		it('matches the email case-insensitively', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			const member = await createUser({ email });

			const context = expectOk(
				await service.identify(
					verified(source, { sub: 'alice', email: 'Alice@Example.com', email_verified: true }),
				),
			);

			expect(context.subject.id).toBe(member.id);
			expect((await readBinding(source, 'alice')).userId).toBe(member.id);
		});

		it('resolves to the binding a concurrent first request wrote', async () => {
			const source = await seedSource({ linkByEmail: 'verified-only' });
			const member = await createUser({ email });
			const other = await createMember();
			// The other request's row lands in the same transaction: SQLite allows one writer,
			// so an out-of-band write would wait on the open transaction forever.
			const repository = Container.get(TrustedSourceIdentityRepository);
			const original = repository.insertIfAbsent.bind(repository);
			vi.spyOn(repository, 'insertIfAbsent').mockImplementationOnce(async (row, ctx) => {
				await original({ ...row, userId: other.id }, ctx);
				await original(row, ctx);
			});

			const context = expectOk(
				await service.identify(verified(source, { sub: 'alice', email, email_verified: true })),
			);

			expect(context.subject.id).toBe(other.id);
			expect(context.subject.id).not.toBe(member.id);
			expect(await bindings.countBy({ sourceId: source.id, subject: 'alice' })).toBe(1);
			expect(emit).not.toHaveBeenCalledWith(
				'trusted-source-identity-linked',
				expect.objectContaining({ userId: member.id }),
			);
		});

		it('keeps the first binding when insertIfAbsent runs twice for one subject', async () => {
			const source = await seedSource();
			const first = await createMember();
			const second = await createMember();
			const identities = Container.get(TrustedSourceIdentityRepository);
			const row = {
				sourceId: source.id,
				subject: 'alice',
				provenance: 'claim-match',
				status: 'active',
			} as const;

			await identities.insertIfAbsent({ ...row, userId: first.id });
			await expect(
				identities.insertIfAbsent({ ...row, userId: second.id }),
			).resolves.toBeUndefined();

			expect(await bindings.count()).toBe(1);
			expect((await readBinding(source, 'alice')).userId).toBe(first.id);
		});
	});

	describe('just-in-time provisioning', () => {
		const roleMapping: TrustedSourceIdentity['roleMapping'] = {
			mode: 'on-provision',
			instanceRoleRules: [],
			projectRoleRules: [],
			fallbackInstanceRole: 'global:member',
		};
		const jit: Partial<TrustedSourceIdentity> = { provision: { human: 'jit' }, roleMapping };

		it('creates the user with a personal project and the jit binding, then emits the provisioned event', async () => {
			const source = await seedSource(jit);

			const context = expectOk(
				await service.identify(
					verified(source, {
						sub: 'bob',
						email: 'New.User@Example.com',
						email_verified: true,
						name: 'Ada King Lovelace',
					}),
				),
			);

			const user = await users.findOneOrFail({
				where: { email: 'new.user@example.com' },
				relations: ['role'],
			});
			expect(user).toMatchObject({
				firstName: 'Ada',
				lastName: 'King Lovelace',
				password: '!trusted-source-no-password',
			});
			expect(user.role.slug).toBe('global:member');
			expect(
				await Container.get(ProjectRepository).getPersonalProjectForUser(user.id),
			).not.toBeNull();
			expect(await readBinding(source, 'bob')).toMatchObject({
				provenance: 'jit',
				status: 'active',
				userId: user.id,
			});
			expect(context.subject.id).toBe(user.id);
			expect(emit).toHaveBeenCalledWith('trusted-source-user-provisioned', {
				userId: user.id,
				sourceId: source.id,
				issuer: source.issuer,
				subject: 'bob',
				role: 'global:member',
			});
		});

		it('cuts the first name to 32 characters', async () => {
			const source = await seedSource(jit);
			const longFirst = 'A'.repeat(40);

			expectOk(
				await service.identify(
					verified(source, {
						sub: 'bob',
						email: 'bob@example.com',
						email_verified: true,
						name: `${longFirst} Lovelace`,
					}),
				),
			);

			const user = await users.findOneByOrFail({ email: 'bob@example.com' });
			expect(user.firstName).toHaveLength(32);
			expect(user.lastName).toBe('Lovelace');
		});

		it.each([
			['no email claim', { sub: 'bob' }],
			['an invalid email', { sub: 'bob', email: 'not-an-email', email_verified: true }],
		])('refuses to provision with %s and writes nothing', async (_label, claims) => {
			const source = await seedSource(jit);
			const userCount = await users.count();

			const result = await service.identify(verified(source, claims));

			expect(rejectReason(result)).toBe('provision-refused');
			expect(await users.count()).toBe(userCount);
			expect(await bindings.count()).toBe(0);
		});

		it('refuses to provision when provisioning is off', async () => {
			const source = await seedSource();

			const result = await service.identify(
				verified(source, { sub: 'bob', email: 'bob@example.com', email_verified: true }),
			);

			expect(rejectReason(result)).toBe('provision-refused');
			expect(await users.countBy({ email: 'bob@example.com' })).toBe(0);
			expect(await bindings.count()).toBe(0);
		});

		it('rejects with no-role when the fallback role does not exist and writes nothing', async () => {
			const source = await seedSource({
				...jit,
				roleMapping: { ...roleMapping, fallbackInstanceRole: 'global:nope' },
			});

			const result = await service.identify(
				verified(source, { sub: 'bob', email: 'bob@example.com', email_verified: true }),
			);

			expect(rejectReason(result)).toBe('no-role');
			expect(await users.countBy({ email: 'bob@example.com' })).toBe(0);
			expect(await bindings.count()).toBe(0);
		});

		it('provisions an unverified email under verified-only when no user matches', async () => {
			const source = await seedSource({ ...jit, linkByEmail: 'verified-only' });

			const context = expectOk(
				await service.identify(
					verified(source, { sub: 'bob', email: 'bob@example.com', email_verified: false }),
				),
			);

			const user = await users.findOneByOrFail({ email: 'bob@example.com' });
			expect(context.subject.id).toBe(user.id);
			expect((await readBinding(source, 'bob')).provenance).toBe('jit');
		});
	});
	describe('role mapping', () => {
		const adminRule: RoleMappingRule = {
			id: 'r1',
			expression: '{{ $claims.groups.includes("admins") }}',
			role: 'global:admin',
			enabled: true,
		};
		const editorRule = (projectId: string): RoleMappingRule => ({
			id: 'r2',
			expression: '{{ $claims.groups.includes("team") }}',
			role: 'project:editor',
			projectId,
			enabled: true,
		});
		const mapping = (
			mode: TrustedSourceIdentity['roleMapping']['mode'],
			rules: Partial<
				Pick<TrustedSourceIdentity['roleMapping'], 'instanceRoleRules' | 'projectRoleRules'>
			> = {},
		): TrustedSourceIdentity['roleMapping'] => ({
			mode,
			fallbackInstanceRole: 'global:member',
			instanceRoleRules: [],
			projectRoleRules: [],
			...rules,
		});
		const jitSource = async (roleMapping: TrustedSourceIdentity['roleMapping']) =>
			await seedSource({
				linkByEmail: 'verified-only',
				provision: { human: 'jit' },
				roleMapping,
			});
		const claims = (sub: string, email: string, groups: string[]) => ({
			sub,
			email,
			email_verified: true,
			groups,
		});

		const roleOf = async (userId: string) => (await users.findByIdWithRole(userId))?.role.slug;
		const relationsOf = async (userId: string) =>
			(
				await Container.get(ProjectRelationRepository).find({
					where: { userId },
					relations: { role: true },
				})
			).map(({ projectId, role }) => ({ projectId, role: role.slug }));
		const roleUpdates = () =>
			emit.mock.calls.filter(([name]) => name === 'sso-user-instance-role-updated');
		const spyOnResolve = () => vi.spyOn(Container.get(RoleResolverService), 'resolveRoles');

		it('writes nothing and evaluates no rule when the mode is off', async () => {
			const source = await seedSource({
				roleMapping: { mode: 'off', instanceRoleRules: [adminRule], projectRoleRules: [] },
			});
			const member = await createMember();
			await bind(source, 'alice', member.id, { provenance: 'jit' });
			const resolve = spyOnResolve();

			expectOk(await service.identify(verified(source, claims('alice', member.email, ['admins']))));

			expect(await roleOf(member.id)).toBe('global:member');
			expect(resolve).not.toHaveBeenCalled();
			expect(roleUpdates()).toHaveLength(0);
		});

		it('provisions the new user with the mapped instance role and project relation', async () => {
			const team = await createTeamProject();
			const source = await jitSource(
				mapping('on-provision', {
					instanceRoleRules: [adminRule],
					projectRoleRules: [editorRule(team.id)],
				}),
			);

			const context = expectOk(
				await service.identify(
					verified(source, claims('bob', 'bob@example.com', ['admins', 'team'])),
				),
			);

			expect(await roleOf(context.subject.id)).toBe('global:admin');
			expect(await relationsOf(context.subject.id)).toEqual(
				expect.arrayContaining([
					{ projectId: team.id, role: 'project:editor' },
					expect.objectContaining({ role: 'project:personalOwner' }),
				]),
			);
			expect(await relationsOf(context.subject.id)).toHaveLength(2);
			expect(emit).toHaveBeenCalledWith(
				'trusted-source-user-provisioned',
				expect.objectContaining({ userId: context.subject.id, role: 'global:admin' }),
			);
		});

		it('leaves the roles of a provisioned user alone when later claims differ', async () => {
			const team = await createTeamProject();
			const source = await jitSource(
				mapping('on-provision', {
					instanceRoleRules: [adminRule],
					projectRoleRules: [editorRule(team.id)],
				}),
			);
			const first = expectOk(
				await service.identify(
					verified(source, claims('bob', 'bob@example.com', ['admins', 'team'])),
				),
			);

			const second = expectOk(
				await service.identify(verified(source, claims('bob', 'bob@example.com', []))),
			);

			expect(second.subject.id).toBe(first.subject.id);
			expect(await roleOf(first.subject.id)).toBe('global:admin');
			expect(await relationsOf(first.subject.id)).toContainEqual({
				projectId: team.id,
				role: 'project:editor',
			});
			expect(roleUpdates()).toHaveLength(0);
		});

		it('provisions with the fallback role when no instance rule matches', async () => {
			const source = await jitSource(mapping('on-provision', { instanceRoleRules: [adminRule] }));
			const resolve = spyOnResolve();

			const context = expectOk(
				await service.identify(verified(source, claims('bob', 'bob@example.com', ['guests']))),
			);

			expect(resolve).toHaveBeenCalledTimes(1);
			expect(await roleOf(context.subject.id)).toBe('global:member');
			expect(emit).toHaveBeenCalledWith(
				'trusted-source-user-provisioned',
				expect.objectContaining({ role: 'global:member' }),
			);
		});

		it('updates the instance role of a jit user continuously and only on change', async () => {
			const source = await jitSource(mapping('continuous', { instanceRoleRules: [adminRule] }));
			const member = await createMember();
			await bind(source, 'alice', member.id, { provenance: 'jit' });
			const input = verified(source, claims('alice', member.email, ['admins']));

			expectOk(await service.identify(input));

			expect(await roleOf(member.id)).toBe('global:admin');
			expect(emit).toHaveBeenCalledWith('sso-user-instance-role-updated', {
				role: 'global:admin',
				userId: member.id,
			});

			const changeUserRole = vi.spyOn(Container.get(UserService), 'changeUserRole');

			expectOk(await service.identify(input));

			expect(changeUserRole).not.toHaveBeenCalled();
			expect(roleUpdates()).toHaveLength(1);
		});

		it('evaluates the rules for a claim-match binding but writes nothing', async () => {
			const source = await jitSource(mapping('continuous', { instanceRoleRules: [adminRule] }));
			const member = await createMember();
			await bind(source, 'alice', member.id, { provenance: 'claim-match' });
			const resolve = spyOnResolve();

			expectOk(await service.identify(verified(source, claims('alice', member.email, ['admins']))));

			expect(resolve).toHaveBeenCalledTimes(1);
			expect(await roleOf(member.id)).toBe('global:member');
			expect(roleUpdates()).toHaveLength(0);
		});

		it('rejects a block-access result before it stamps lastSeenAt', async () => {
			const source = await jitSource(
				mapping('continuous', {
					instanceRoleRules: [{ ...adminRule, role: BLOCK_ACCESS_ASSIGNMENT }],
				}),
			);
			const member = await createMember();
			const lastSeenAt = secondsAgo(7 * 86400);
			await bind(source, 'alice', member.id, { provenance: 'jit', lastSeenAt });

			const result = await service.identify(
				verified(source, claims('alice', member.email, ['admins'])),
			);

			expect(rejectReason(result)).toBe('no-role');
			expect((await readBinding(source, 'alice')).lastSeenAt?.getTime()).toBe(lastSeenAt.getTime());
			expect(await roleOf(member.id)).toBe('global:member');
		});

		it('rejects an instance rule that names a role that does not exist and writes nothing', async () => {
			const source = await jitSource(
				mapping('continuous', { instanceRoleRules: [{ ...adminRule, role: 'global:nope' }] }),
			);
			const member = await createMember();
			await bind(source, 'alice', member.id, { provenance: 'jit' });

			const result = await service.identify(
				verified(source, claims('alice', member.email, ['admins'])),
			);

			expect(rejectReason(result)).toBe('no-role');
			expect((await readBinding(source, 'alice')).lastSeenAt).toBeNull();
			expect(await roleOf(member.id)).toBe('global:member');
			expect(roleUpdates()).toHaveLength(0);
		});

		it('keeps existing team-project relations when no project rule is enabled', async () => {
			const source = await jitSource(mapping('continuous', { instanceRoleRules: [adminRule] }));
			const member = await createMember();
			const team = await createTeamProject();
			await linkUserToProject(member, team, 'project:editor');
			await bind(source, 'alice', member.id, { provenance: 'jit' });

			expectOk(await service.identify(verified(source, claims('alice', member.email, ['admins']))));

			expect(await roleOf(member.id)).toBe('global:admin');
			expect(await relationsOf(member.id)).toContainEqual({
				projectId: team.id,
				role: 'project:editor',
			});
		});

		it('never changes the role of the instance owner', async () => {
			const source = await jitSource(mapping('continuous', { instanceRoleRules: [adminRule] }));
			const owner = await createOwner();
			await bind(source, 'alice', owner.id, { provenance: 'jit' });
			const resolve = spyOnResolve();

			expectOk(await service.identify(verified(source, claims('alice', owner.email, ['admins']))));

			expect(resolve).toHaveBeenCalledTimes(1);
			expect(await roleOf(owner.id)).toBe('global:owner');
			expect(roleUpdates()).toHaveLength(0);
		});

		it('rejects a project rule that names a non-project role and provisions nothing', async () => {
			const team = await createTeamProject();
			const source = await jitSource(
				mapping('on-provision', {
					projectRoleRules: [{ ...editorRule(team.id), role: 'global:admin' }],
				}),
			);

			const result = await service.identify(
				verified(source, claims('bob', 'bob@example.com', ['team'])),
			);

			expect(rejectReason(result)).toBe('no-role');
			expect(await users.countBy({ email: 'bob@example.com' })).toBe(0);
			expect(await bindings.count()).toBe(0);
		});

		it('treats a rule whose expression throws as no match and applies the fallback', async () => {
			const source = await jitSource(
				mapping('continuous', {
					instanceRoleRules: [{ ...adminRule, expression: '{{ $claims.x.y.z }}' }],
				}),
			);
			const admin = await createAdmin();
			await bind(source, 'alice', admin.id, { provenance: 'jit' });

			expectOk(await service.identify(verified(source, claims('alice', admin.email, ['admins']))));

			expect(await roleOf(admin.id)).toBe('global:member');
		});
	});
});
