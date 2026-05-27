import type { GlobalConfig } from '@n8n/config';
import type { SelectQueryBuilder } from '@n8n/typeorm';

import { applyWorkflowBooleanSettingFilter } from '../apply-workflow-boolean-setting-filter';

function createMockQb() {
	const qb = {
		andWhere: jest.fn(),
		where: jest.fn(),
		orWhere: jest.fn(),
	} as unknown as SelectQueryBuilder<object>;
	return qb;
}

function createGlobalConfig(dbType: 'postgresdb' | 'sqlite') {
	return { database: { type: dbType } } as GlobalConfig;
}

describe('applyWorkflowBooleanSettingFilter', () => {
	describe('key validation', () => {
		it('should reject keys with special characters', () => {
			const qb = createMockQb();
			expect(() =>
				applyWorkflowBooleanSettingFilter(qb, createGlobalConfig('sqlite'), "'; DROP TABLE", true),
			).toThrow('Invalid settings key');
		});

		it('should reject keys starting with a number', () => {
			const qb = createMockQb();
			expect(() =>
				applyWorkflowBooleanSettingFilter(qb, createGlobalConfig('sqlite'), '1abc', true),
			).toThrow('Invalid settings key');
		});

		it('should accept valid alphanumeric keys', () => {
			const qb = createMockQb();
			expect(() =>
				applyWorkflowBooleanSettingFilter(qb, createGlobalConfig('sqlite'), 'availableInMCP', true),
			).not.toThrow();
		});
	});

	describe('postgres', () => {
		const config = createGlobalConfig('postgresdb');

		it('should filter for true values', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', true);

			expect(qb.andWhere).toHaveBeenCalledWith(
				"workflow.settings ->> 'availableInMCP' = :availableInMCP",
				{ availableInMCP: 'true' },
			);
		});

		it('should filter for false values', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', false);

			expect(qb.andWhere).toHaveBeenCalledWith(
				"(workflow.settings ->> 'availableInMCP' = :availableInMCP)",
				{ availableInMCP: 'false' },
			);
		});

		it('should include null clause when includeNullOnFalse is true', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', false, {
				includeNullOnFalse: true,
			});

			expect(qb.andWhere).toHaveBeenCalledWith(
				"(workflow.settings ->> 'availableInMCP' = :availableInMCP OR workflow.settings ->> 'availableInMCP' IS NULL)",
				{ availableInMCP: 'false' },
			);
		});
	});

	describe('sqlite', () => {
		const config = createGlobalConfig('sqlite');

		it('should filter for true values', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', true);

			expect(qb.andWhere).toHaveBeenCalledWith(
				"JSON_EXTRACT(workflow.settings, '$.availableInMCP') = :availableInMCP",
				{ availableInMCP: 1 },
			);
		});

		it('should filter for false values', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', false);

			expect(qb.andWhere).toHaveBeenCalledWith(
				"(JSON_EXTRACT(workflow.settings, '$.availableInMCP') = :availableInMCP)",
				{ availableInMCP: 0 },
			);
		});

		it('should include null clause when includeNullOnFalse is true', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', false, {
				includeNullOnFalse: true,
			});

			expect(qb.andWhere).toHaveBeenCalledWith(
				"(JSON_EXTRACT(workflow.settings, '$.availableInMCP') = :availableInMCP OR JSON_EXTRACT(workflow.settings, '$.availableInMCP') IS NULL)",
				{ availableInMCP: 0 },
			);
		});
	});

	describe('options', () => {
		const config = createGlobalConfig('sqlite');

		it('should use custom alias', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', true, { alias: 'wf' });

			expect(qb.andWhere).toHaveBeenCalledWith(
				"JSON_EXTRACT(wf.settings, '$.availableInMCP') = :availableInMCP",
				{ availableInMCP: 1 },
			);
		});

		it('should use custom method', () => {
			const qb = createMockQb();
			applyWorkflowBooleanSettingFilter(qb, config, 'availableInMCP', true, { method: 'where' });

			expect(qb.where).toHaveBeenCalled();
			expect(qb.andWhere).not.toHaveBeenCalled();
		});
	});
});
