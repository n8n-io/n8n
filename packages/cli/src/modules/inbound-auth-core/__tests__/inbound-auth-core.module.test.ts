import { ModuleMetadata, type ModuleInterface } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	IdentityService,
	LocalAuthorizationServer,
	migrateToLatest,
	TrustedSourceConfigSchema,
	TrustedSourceGate,
	TrustedSourceStore,
	type Extracted,
	type TrustedSource,
	type Verified,
} from '@n8n/inbound-auth';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { OAuth2AuthenticationService } from '../authentication.service';
import { InboundAuthCoreModule } from '../inbound-auth-core.module';
import { TrustedSourceDiscoveryTask } from '../trusted-source-discovery.task';
import { TrustedSourceDbGate } from '../trusted-source.gate';
import { TrustedSourceDbStore } from '../trusted-source.store';

describe('InboundAuthCoreModule', () => {
	describe('init', () => {
		const extracted = {
			surface: 'instance-mcp',
			resource: { url: 'https://n8n.example/mcp', acceptedAudiences: ['https://n8n.example/mcp'] },
			request: { method: 'POST', url: '/mcp', headers: {}, ip: '203.0.113.7' },
			receivedAt: new Date(),
			credential: { kind: 'bearer', token: 'a.b.c' },
		} satisfies Extracted;

		const dbStore = mock<TrustedSourceDbStore>();
		const dbGate = mock<TrustedSourceDbGate>();

		beforeAll(async () => {
			Container.set(TrustedSourceDbStore, dbStore);
			Container.set(TrustedSourceDbGate, dbGate);
			await new InboundAuthCoreModule().init();
		});

		it('binds the TrustedSourceStore contract to the database store', () => {
			expect(Container.get(TrustedSourceStore)).toBe(dbStore);
		});

		it('binds the TrustedSourceGate contract to the database gate', () => {
			expect(Container.get(TrustedSourceGate)).toBe(dbGate);
		});

		it('binds a LocalAuthorizationServer that rejects until the OAuth2 server registers itself', async () => {
			const server = Container.get(LocalAuthorizationServer);

			await expect(server.getMetadata()).rejects.toThrow(OperationalError);
			await expect(server.getJwks()).rejects.toThrow(OperationalError);
		});

		it('binds the OAuth2 AuthenticationService', () => {
			expect(Container.get(AuthenticationService)).toBeInstanceOf(OAuth2AuthenticationService);
		});

		it('binds an IdentityService that fails closed until an implementation is registered', async () => {
			const source: TrustedSource = {
				id: 'source-1',
				name: 'Example IdP',
				type: 'oauth2',
				issuer: 'https://idp.example',
				managedBy: 'admin',
				status: 'unchecked',
				lastError: null,
				lastCheckedAt: null,
				createdAt: '2026-09-30T10:00:00.000Z',
				updatedAt: '2026-09-30T10:00:00.000Z',
				config: migrateToLatest(
					TrustedSourceConfigSchema.parse({
						version: 1,
						authentication: { type: 'oauth2' },
						surfaces: { 'instance-mcp': {} },
					}),
				),
				metadata: null,
			};
			const {
				credential,
				request: { headers: _headers, ...request },
				...rest
			} = extracted;
			const verified = {
				...rest,
				request,
				credentialKind: credential.kind,
				source,
				claims: { sub: 'alice' },
				expiresAt: new Date(),
			} satisfies Verified;

			const result = await Container.get(IdentityService).identify(verified);

			expect(result).toMatchObject({ ok: false, reason: 'source-unusable' });
		});
	});

	it('registers itself on main, webhook and worker instances without a license flag', () => {
		const entry = Container.get(ModuleMetadata).get('inbound-auth-core');

		expect(entry).toBeDefined();
		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
		expect(entry?.licenseFlag).toBeUndefined();
	});

	it('exposes the discovery task as its only system task', async () => {
		const module: ModuleInterface = new InboundAuthCoreModule();

		expect(module.systemTasks).toBeDefined();
		expect(await module.systemTasks?.()).toEqual([TrustedSourceDiscoveryTask]);
	});

	it('exposes its entities so the datasource picks them up', async () => {
		const module = new InboundAuthCoreModule();

		const entities = (await module.entities()) as unknown as Array<{ name: string }>;

		expect(entities.map((entity) => entity.name)).toEqual([
			'TrustedSourceEntity',
			'TrustedSourceIdentityEntity',
		]);
	});
});
