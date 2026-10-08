import { CacheService } from '@n8n/backend-services';
import { testDb, testModules } from '@n8n/backend-test-utils';
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
import { TrustedSourceIdentityService } from '@/modules/inbound-auth-core/identity/trusted-source-identity.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';

import { createMember, createOwner, createUser } from '../shared/db/users';

const RESOURCE = 'https://n8n.example/mcp';

let cipher: Cipher;
let cacheService: CacheService;
let rows: Repository<TrustedSourceEntity>;
let bindings: Repository<TrustedSourceIdentityEntity>;
let service: TrustedSourceIdentityService;

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
	service = Container.get(TrustedSourceIdentityService);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceIdentityEntity', 'TrustedSourceEntity', 'User']);
	await cacheService.reset();
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
});
