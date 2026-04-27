import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Type-only import — erased at compile time; the rule's check is purely
// syntactic and doesn't distinguish, so we disable it here.
// eslint-disable-next-line n8n-local-rules/no-top-level-relative-imports-in-backend-module
import type { V0Client as V0ClientType } from './v0-client';

@BackendModule({ name: 'frontend-builder', instanceTypes: ['main'] })
export class FrontendBuilderModule implements ModuleInterface {
	async init() {
		const { FrontendBuilderConfig } = await import('./frontend-builder.config');
		const { FakeV0Client } = await import('./v0-client.fake');
		const { V0Client } = await import('./v0-client');

		const config = Container.get(FrontendBuilderConfig);

		// With a real V0_API_KEY, Container.get(V0Client) instantiates the
		// real class. Without one, override with FakeV0Client so dev can
		// click through the UI without credentials and real V0Client never
		// hits its `apiKey` guard. Cast bypasses structural mismatch on the
		// private `v0` field — both classes implement IV0Client.
		if (!config.apiKey) {
			Container.set(V0Client, Container.get(FakeV0Client) as unknown as V0ClientType);
		}

		await import('./frontend-builder.controller');
	}

	async settings() {
		return { enabled: true };
	}
}
