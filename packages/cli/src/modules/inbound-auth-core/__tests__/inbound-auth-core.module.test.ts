import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	IdentityService,
	TrustedSourceGate,
	type Extracted,
	type Verified,
} from '@n8n/inbound-auth';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { InboundAuthCoreModule } from '../inbound-auth-core.module';

describe('InboundAuthCoreModule', () => {
	describe('init', () => {
		const extracted = {
			surface: 'instance-mcp',
			resource: { url: 'https://n8n.example/mcp', acceptedAudiences: ['https://n8n.example/mcp'] },
			request: { method: 'POST', url: '/mcp', headers: {}, ip: '203.0.113.7' },
			receivedAt: new Date(),
			credential: { kind: 'bearer', token: 'a.b.c' },
		} satisfies Extracted;

		beforeAll(async () => {
			await new InboundAuthCoreModule().init();
		});

		it('binds an AuthenticationService that fails closed until a driver is registered', async () => {
			const result = await Container.get(AuthenticationService).authenticate(extracted);

			expect(result).toMatchObject({ ok: false, reason: 'source-unusable' });
		});

		it('binds an IdentityService that fails closed until an implementation is registered', async () => {
			const { credential, ...rest } = extracted;
			const verified = {
				...rest,
				credentialKind: credential.kind,
				claims: { sub: 'alice' },
				expiresAt: new Date(),
			} as unknown as Verified;

			const result = await Container.get(IdentityService).identify(verified);

			expect(result).toMatchObject({ ok: false, reason: 'source-unusable' });
		});

		it('binds a TrustedSourceGate that denies until an implementation is registered', async () => {
			const allowed = await Container.get(TrustedSourceGate).authorizeSealed({
				userId: 'user-1',
				grant: { audiences: ['https://n8n.example/mcp'] },
			});

			expect(allowed).toBe(false);
		});
	});

	it('registers itself on main, webhook and worker instances without a license flag', () => {
		const entry = Container.get(ModuleMetadata).get('inbound-auth-core');

		expect(entry).toBeDefined();
		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
		expect(entry?.licenseFlag).toBeUndefined();
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
