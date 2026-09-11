import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ModuleName } from '@n8n/backend-common';
import { Logger, ModulesConfig } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { Controller } from '@n8n/decorators';
import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { InstanceMonitoringReportRepository } from '../database/repositories/instance-monitoring-report.repository';
import { InstanceReportingScheduler } from '../instance-reporting-scheduler.service';
import { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { InstanceReportingConfig } from '../instance-reporting.config';
import { InstanceReportingModule } from '../instance-reporting.module';

// Compile-time pin: the settings this module returns are read by the frontend
// under this exact key, so the decorator name must stay a member of
// `FrontendModuleSettings`.
const MODULE_NAME = 'instance-reporting' satisfies keyof FrontendModuleSettings;

const REPORT_TIME = '07:42';
const LAST_DELIVERY = new Date('2026-03-25T07:42:13.000Z');

function setUpContainer({
	baseUrl = 'https://example.com',
	disabledModules = [] as ModuleName[],
	lastDelivery = LAST_DELIVERY as Date | null,
} = {}) {
	const config = new InstanceReportingConfig();
	config.instanceReportingBaseUrl = baseUrl;
	Container.set(InstanceReportingConfig, config);

	Container.set(ModulesConfig, mock<ModulesConfig>({ disabledModules }));
	Container.set(Logger, mockLogger());

	const settingsService = mock<InstanceReportingSettingsService>();
	settingsService.getReportTime.mockResolvedValue(REPORT_TIME);
	Container.set(InstanceReportingSettingsService, settingsService);

	const reportRepository = mock<InstanceMonitoringReportRepository>();
	reportRepository.findLastDeliveryTime.mockResolvedValue(lastDelivery);
	Container.set(InstanceMonitoringReportRepository, reportRepository);

	const scheduler = mock<InstanceReportingScheduler>();
	Container.set(InstanceReportingScheduler, scheduler);

	return { settingsService, reportRepository, scheduler };
}

describe('InstanceReportingModule', () => {
	describe('settings()', () => {
		it('reports the time the instance is due to report at', async () => {
			setUpContainer();

			const settings = await new InstanceReportingModule().settings();

			expect(settings).toEqual({ enabled: true, reportTime: REPORT_TIME });
		});

		// These settings are cached for the lifetime of the process, so the last
		// delivery time is served by the module's own endpoint instead.
		it('leaves the last delivery time out, reading nothing from the reports', async () => {
			const { reportRepository } = setUpContainer();

			await new InstanceReportingModule().settings();

			expect(reportRepository.findLastDeliveryTime).not.toHaveBeenCalled();
		});

		it('reports as disabled, claiming no time and reading nothing, without a receiver', async () => {
			const { settingsService, reportRepository } = setUpContainer({ baseUrl: '' });

			const settings = await new InstanceReportingModule().settings();

			expect(settings).toEqual({ enabled: false });
			expect(settingsService.getReportTime).not.toHaveBeenCalled();
			expect(reportRepository.findLastDeliveryTime).not.toHaveBeenCalled();
		});
	});

	describe('init()', () => {
		it('starts the scheduler', async () => {
			const { scheduler } = setUpContainer();

			await new InstanceReportingModule().init();

			expect(scheduler.init).toHaveBeenCalled();
		});

		it('fails when the insights module is disabled', async () => {
			setUpContainer({ disabledModules: ['insights'] });

			await expect(new InstanceReportingModule().init()).rejects.toThrow(UserError);
		});

		it('leaves the scheduler alone when no receiver is configured', async () => {
			const { scheduler } = setUpContainer({ baseUrl: '' });

			await new InstanceReportingModule().init();

			expect(scheduler.init).not.toHaveBeenCalled();
		});

		// The route belongs to the loaded module, not to the receiver, so a client
		// that asks anyway gets an answer instead of a 404.
		it('registers the status route even when no receiver is configured', async () => {
			setUpContainer({ baseUrl: '' });

			await new InstanceReportingModule().init();

			const { InstanceReportingController } = await import('../instance-reporting.controller.js');
			const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
				InstanceReportingController as Controller,
			);

			expect(metadata.basePath).toBe('/instance-reporting');
			expect(metadata.routes.get('getStatus')?.path).toBe('/status');
		});
	});

	it('is registered under the module-settings key the frontend reads', () => {
		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.class).toBe(InstanceReportingModule);
	});
});
