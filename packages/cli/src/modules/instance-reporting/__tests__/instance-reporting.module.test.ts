import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ModuleName } from '@n8n/backend-common';
import { Logger, ModulesConfig } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { InstanceReportingScheduler } from '../instance-reporting-scheduler.service';
import { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { InstanceReportingConfig } from '../instance-reporting.config';
import { InstanceReportingModule } from '../instance-reporting.module';

// Compile-time pin: the settings this module returns are read by the frontend
// under this exact key, so the decorator name must stay a member of
// `FrontendModuleSettings`.
const MODULE_NAME = 'instance-reporting' satisfies keyof FrontendModuleSettings;

const REPORT_TIME = '07:42';

function setUpContainer({
	baseUrl = 'https://example.com',
	disabledModules = [] as ModuleName[],
} = {}) {
	const config = new InstanceReportingConfig();
	config.instanceReportingBaseUrl = baseUrl;
	Container.set(InstanceReportingConfig, config);

	Container.set(ModulesConfig, mock<ModulesConfig>({ disabledModules }));
	Container.set(Logger, mockLogger());

	const settingsService = mock<InstanceReportingSettingsService>();
	settingsService.getReportTime.mockResolvedValue(REPORT_TIME);
	Container.set(InstanceReportingSettingsService, settingsService);

	const scheduler = mock<InstanceReportingScheduler>();
	Container.set(InstanceReportingScheduler, scheduler);

	return { settingsService, scheduler };
}

describe('InstanceReportingModule', () => {
	describe('settings()', () => {
		it('reports the time the instance is due to report at', async () => {
			setUpContainer();

			const settings = await new InstanceReportingModule().settings();

			expect(settings).toEqual({ enabled: true, reportTime: REPORT_TIME });
		});

		it('reports as disabled and claims no time when no receiver is configured', async () => {
			const { settingsService } = setUpContainer({ baseUrl: '' });

			const settings = await new InstanceReportingModule().settings();

			expect(settings).toEqual({ enabled: false });
			expect(settingsService.getReportTime).not.toHaveBeenCalled();
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
	});

	it('is registered under the module-settings key the frontend reads', () => {
		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.class).toBe(InstanceReportingModule);
	});
});
