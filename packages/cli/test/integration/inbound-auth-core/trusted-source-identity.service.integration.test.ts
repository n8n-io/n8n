import { CacheService, EventService } from '@n8n/backend-services';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	trustedSourceConfigSchemaFor,
	type ManagedBy,
	type Result,
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

import { createMember, createOwner, createUser } from '../shared/db/users';

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

		it('refuses a subject without a binding and writes no row', async () => {
			const source = await seedSource();
			await createMember();

			const result = await service.identify(verified(source, { sub: 'alice' }));

			expect(rejectReason(result)).toBe('link-refused');
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
			const repository = Container.get(UserRepository);
			const original = repository.findByEmailWithRole.bind(repository);
			vi.spyOn(repository, 'findByEmailWithRole').mockImplementationOnce(async (lookup) => {
				await bind(source, 'alice', other.id);
				return await original(lookup);
			});

			const context = expectOk(
				await service.identify(verified(source, { sub: 'alice', email, email_verified: true })),
			);

			expect(context.subject.id).toBe(other.id);
			expect(context.subject.id).not.toBe(member.id);
			expect(await bindings.countBy({ sourceId: source.id, subject: 'alice' })).toBe(1);
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
});
