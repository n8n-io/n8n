import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { FakeV0Client } from './v0-client.fake';
import { V0Client } from './v0-client';

@BackendModule({ name: 'frontend-builder', instanceTypes: ['main'] })
export class FrontendBuilderModule implements ModuleInterface {
	async init() {
		// Slice 1: always override V0Client with the fake.
		// Slice 2 makes this conditional on whether V0_API_KEY is set.
		Container.set(V0Client, Container.get(FakeV0Client));

		await import('./frontend-builder.controller');
	}

	async settings() {
		return { enabled: true };
	}
}
