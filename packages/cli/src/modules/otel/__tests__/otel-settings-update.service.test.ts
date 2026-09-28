import type { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { OtelSettingsUpdateService } from '../otel-settings-update.service';
import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelService } from '../otel.service';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

describe('OtelSettingsUpdateService', () => {
	it('restarts locally and notifies other instances after saving', async () => {
		const settings = mock<OtelSettingsService>();
		const otel = mock<OtelService>();
		const registry = mock<ModuleRegistry>();
		const publisher = mock<Publisher>();
		const service = new OtelSettingsUpdateService(settings, otel, registry, publisher);
		const config = {
			enabled: false,
			exporterProtocol: 'http/protobuf' as const,
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n',
			exporterHeaders: '',
			tracesSampleRate: 1,
			startupConnectivityTimeoutMs: 2_000,
			includeNodeSpans: false,
			injectOutbound: false,
			productionExecutionsOnly: false,
		};
		const order: string[] = [];
		settings.saveSettings.mockImplementation(async () => {
			order.push('save');
		});
		otel.restart.mockImplementation(async () => {
			order.push('restart');
		});
		registry.refreshModuleSettings.mockImplementation(async () => {
			order.push('refresh');
			return null;
		});
		publisher.publishCommand.mockImplementation(async () => {
			order.push('publish');
		});
		settings.getSettings.mockReturnValue({ ...config, envManagedFields: [] });

		const result = await service.updateSettings(config);

		expect(order).toEqual(['save', 'restart', 'refresh', 'publish']);
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-otel-config' });
		expect(result).toEqual({ ...config, envManagedFields: [] });
	});
});
