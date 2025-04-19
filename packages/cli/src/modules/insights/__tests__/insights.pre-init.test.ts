import type { DatabaseConfig } from '@n8n/config/src/configs/database.config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { ModulePreInitContext } from '@/modules/modules.config';

import { shouldLoadModule } from '../insights.pre-init';

describe('InsightsModulePreInit', () => {
	it('should return false if instance type is not "main"', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'worker' }),
			database: mock<DatabaseConfig>({ type: 'sqlite', sqlite: { poolSize: 10 } }),
		};
		expect(shouldLoadModule(ctx)).toBe(false);
	});

	it('should return false if database type is "sqlite" and poolSize is < 1', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'main' }),
			database: mock<DatabaseConfig>({ type: 'sqlite', sqlite: { poolSize: 0 } }),
		};
		expect(shouldLoadModule(ctx)).toBe(false);
	});

	it.each(['postgresdb', 'mariadb', 'mysqldb'])(
		'should return true if instance type is "main" and database is not sqlite',
		(dbType: 'postgresdb' | 'mysqldb' | 'sqlite' | 'mariadb') => {
			const ctx: ModulePreInitContext = {
				instance: mock<InstanceSettings>({ instanceType: 'main' }),
				database: mock<DatabaseConfig>({ type: dbType }),
			};
			expect(shouldLoadModule(ctx)).toBe(true);
		},
	);

	it('should return true if instance type is "main" and sqlite poolSize is >= 1', () => {
		const ctx: ModulePreInitContext = {
			instance: mock<InstanceSettings>({ instanceType: 'main' }),
			database: mock<DatabaseConfig>({ type: 'sqlite', sqlite: { poolSize: 1 } }),
		};
		expect(shouldLoadModule(ctx)).toBe(true);
	});
});
