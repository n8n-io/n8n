import { ModuleMetadata, type ModuleInterface } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	IdentityService,
	LocalAuthorizationServer,
	TrustedSourceGate,
	TrustedSourceStore,
} from '@n8n/inbound-auth';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { OAuth2AuthenticationService } from '../authentication.service';
import { TrustedSourceIdentityService } from '../identity/trusted-source-identity.service';
import { InboundAuthCoreModule } from '../inbound-auth-core.module';
import { TrustedSourceDiscoveryTask } from '../trusted-source-discovery.task';
import { TrustedSourceDbGate } from '../trusted-source.gate';
import { TrustedSourceDbStore } from '../trusted-source.store';

describe('InboundAuthCoreModule', () => {
	describe('init', () => {
		const dbStore = mock<TrustedSourceDbStore>();
		const dbGate = mock<TrustedSourceDbGate>();
		const identityService = mock<TrustedSourceIdentityService>();

		beforeAll(async () => {
			Container.set(TrustedSourceDbStore, dbStore);
			Container.set(TrustedSourceDbGate, dbGate);
			Container.set(TrustedSourceIdentityService, identityService);
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

		it('binds the IdentityService contract to the trusted-source identity service', () => {
			expect(Container.get(IdentityService)).toBe(identityService);
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
