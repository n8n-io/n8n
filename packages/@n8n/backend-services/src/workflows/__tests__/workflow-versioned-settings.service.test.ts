import type { ModuleName, ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { WorkflowVersionedSettingsService } from '../workflow-versioned-settings.service';

describe('WorkflowVersionedSettingsService', () => {
	const createService = (eligibleModules: ModuleName[]) =>
		new WorkflowVersionedSettingsService(
			mock<ModuleRegistry>({ eligibleModules, isActive: () => false }),
		);

	const draftSettings = { engineType: 'v2', timezone: 'Europe/Berlin' } as const;

	describe('with the engine-v2 module', () => {
		const service = createService(['engine-v2']);

		it('is enabled, also on an instance type that does not start the module', () => {
			expect(service.isEnabled()).toBe(true);
		});

		it('runs production with the engine of the published version and the live workflow settings', () => {
			expect(service.forPublishedRun(draftSettings, { settings: { engineType: 'v1' } })).toEqual({
				engineType: 'v1',
				timezone: 'Europe/Berlin',
			});
		});

		it('runs on v1 when the published version stores no settings', () => {
			expect(service.forPublishedRun(draftSettings, { settings: {} })?.engineType).toBe('v1');
		});
	});

	describe('without the engine-v2 module', () => {
		const service = createService([]);

		it('is not enabled', () => {
			expect(service.isEnabled()).toBe(false);
		});

		it('runs production with the workflow settings, as before', () => {
			expect(service.forPublishedRun(draftSettings, { settings: { engineType: 'v1' } })).toBe(
				draftSettings,
			);
		});
	});
});
