import type { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { WorkflowVersionedSettingsService } from '../workflow-versioned-settings.service';

describe('WorkflowVersionedSettingsService', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const service = new WorkflowVersionedSettingsService(moduleRegistry);

	const draftSettings = { engineType: 'v2', timezone: 'Europe/Berlin' } as const;

	describe('with the engine-v2 module', () => {
		beforeEach(() => {
			moduleRegistry.isActive.mockImplementation((name) => name === 'engine-v2');
		});

		it('is enabled', () => {
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
		beforeEach(() => {
			moduleRegistry.isActive.mockReturnValue(false);
		});

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
