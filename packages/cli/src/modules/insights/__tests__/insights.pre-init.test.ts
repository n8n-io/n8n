import type { DatabaseConfig } from '@n8n/config/src/configs/database.config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { ModulePreInitContext } from '@/modules/modules.config';

import { shouldLoadModule } from '../insights.pre-init';

describe('InsightsModulePreInit', () => {
	it('should return false if instance type is not "main"', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'worker' }),
			database: mock<DatabaseConfig>({ isLegacySqlite: false }),
		};
		expect(shouldLoadModule(ctx)).toBe(false);
	});

	it('should return false if database type is "sqlite" and poolSize is < 1', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'main' }),
			database: mock<DatabaseConfig>({ isLegacySqlite: true }),
		};
		expect(shouldLoadModule(ctx)).toBe(false);
	});

	it('should return true if instance type is "main" and we\'re not using the legacy driver', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'main' }),
			database: mock<DatabaseConfig>({ isLegacySqlite: false }),
		};
		expect(shouldLoadModule(ctx)).toBe(true);
	});
});
