import { Container } from '@n8n/di';

import { OtelModule } from '../otel.module';

describe('OtelModule', () => {
	let module: OtelModule;

	beforeEach(() => {
		Container.reset();
		module = new OtelModule();
	});

	afterEach(() => {
		delete process.env.N8N_OTEL_ENABLED;
	});

	describe('settings()', () => {
		it('reports enabled=true when N8N_OTEL_ENABLED is on', async () => {
			process.env.N8N_OTEL_ENABLED = 'true';

			await expect(module.settings()).resolves.toEqual({ enabled: true });
		});

		it('reports enabled=false when N8N_OTEL_ENABLED is off', async () => {
			process.env.N8N_OTEL_ENABLED = 'false';

			await expect(module.settings()).resolves.toEqual({ enabled: false });
		});

		it('defaults to enabled=false when N8N_OTEL_ENABLED is unset', async () => {
			await expect(module.settings()).resolves.toEqual({ enabled: false });
		});
	});
});
