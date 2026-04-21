import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { WorkflowCheckConfigRepository } from '../database/repositories/workflow-check-config.repository';
import { WorkflowAuthoringChecksService } from '../workflow-authoring-checks.service';
import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowCheck,
	WorkflowCheckViolation,
} from '../workflow-authoring-checks.types';
import { WorkflowCheckRegistry } from '../workflow-check-registry.service';

const makeCheck = (
	id: string,
	title: string,
	violations: WorkflowCheckViolation[],
	defaultSeverity: 'warning' | 'blocking' = 'warning',
): WorkflowCheck => ({
	id,
	defaultSeverity,
	title,
	description: '',
	evaluate: jest.fn().mockResolvedValue(violations),
});

const emptyInput: RunWorkflowAuthoringChecksInput = {
	workflowId: 'wf-1',
	nodes: [],
	connections: {},
	settings: undefined,
};

const makeConfigRepo = (
	entries: Array<{
		checkId: string;
		enabled: boolean;
		severityOverride: 'warning' | 'blocking' | null;
	}> = [],
) => {
	const map = new Map(entries.map((entry) => [entry.checkId, entry]));
	return mock<WorkflowCheckConfigRepository>({
		findAllById: jest.fn().mockResolvedValue(map),
		findOne: jest
			.fn()
			.mockImplementation(
				async ({ where: { checkId } }: { where: { checkId: string } }) => map.get(checkId) ?? null,
			),
		upsertConfig: jest
			.fn()
			.mockImplementation(
				async (
					checkId: string,
					patch: { enabled?: boolean; severityOverride?: 'warning' | 'blocking' | null },
				) => ({
					checkId,
					enabled: patch.enabled ?? true,
					severityOverride: patch.severityOverride ?? null,
				}),
			),
	});
};

describe('WorkflowAuthoringChecksService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	it('returns no results when no checks are registered', async () => {
		const registry = new WorkflowCheckRegistry();
		const service = new WorkflowAuthoringChecksService(registry, makeConfigRepo(), logger);

		expect(await service.runAll(emptyInput)).toEqual([]);
	});

	it('skips checks that return no violations', async () => {
		const registry = new WorkflowCheckRegistry();
		registry.register(makeCheck('passing', 'Passing check', []));
		const service = new WorkflowAuthoringChecksService(registry, makeConfigRepo(), logger);

		expect(await service.runAll(emptyInput)).toEqual([]);
	});

	it('aggregates violations from each failing check with its default severity', async () => {
		const registry = new WorkflowCheckRegistry();
		registry.register(
			makeCheck('warn-check', 'Warn check', [{ message: 'w', nodeIds: ['n1'] }], 'warning'),
		);
		registry.register(
			makeCheck('block-check', 'Block check', [{ message: 'b', nodeIds: ['n2'] }], 'blocking'),
		);
		const service = new WorkflowAuthoringChecksService(registry, makeConfigRepo(), logger);

		const results = await service.runAll(emptyInput);

		expect(results).toHaveLength(2);
		expect(results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					checkId: 'warn-check',
					severity: 'warning',
					violations: [{ message: 'w', nodeIds: ['n1'] }],
				}),
				expect.objectContaining({
					checkId: 'block-check',
					severity: 'blocking',
					violations: [{ message: 'b', nodeIds: ['n2'] }],
				}),
			]),
		);
	});

	it('skips disabled checks', async () => {
		const registry = new WorkflowCheckRegistry();
		registry.register(makeCheck('off', 'Off check', [{ message: 'ignore me' }], 'warning'));
		const service = new WorkflowAuthoringChecksService(
			registry,
			makeConfigRepo([{ checkId: 'off', enabled: false, severityOverride: null }]),
			logger,
		);

		expect(await service.runAll(emptyInput)).toEqual([]);
	});

	it('applies severity override when present', async () => {
		const registry = new WorkflowCheckRegistry();
		registry.register(makeCheck('over', 'Over check', [{ message: 'v' }], 'warning'));
		const service = new WorkflowAuthoringChecksService(
			registry,
			makeConfigRepo([{ checkId: 'over', enabled: true, severityOverride: 'blocking' }]),
			logger,
		);

		const results = await service.runAll(emptyInput);
		expect(results).toEqual([expect.objectContaining({ checkId: 'over', severity: 'blocking' })]);
	});

	describe('listChecksWithConfig', () => {
		it('returns every registered check merged with its stored config', async () => {
			const registry = new WorkflowCheckRegistry();
			registry.register(makeCheck('a', 'A', [], 'warning'));
			registry.register(makeCheck('b', 'B', [], 'blocking'));
			const service = new WorkflowAuthoringChecksService(
				registry,
				makeConfigRepo([{ checkId: 'a', enabled: false, severityOverride: 'blocking' }]),
				logger,
			);

			const checks = await service.listChecksWithConfig();

			expect(checks).toEqual(
				expect.arrayContaining([
					{
						checkId: 'a',
						title: 'A',
						description: '',
						defaultSeverity: 'warning',
						severityOverride: 'blocking',
						effectiveSeverity: 'blocking',
						enabled: false,
					},
					{
						checkId: 'b',
						title: 'B',
						description: '',
						defaultSeverity: 'blocking',
						severityOverride: null,
						effectiveSeverity: 'blocking',
						enabled: true,
					},
				]),
			);
		});
	});

	describe('updateConfig', () => {
		it('returns null for unknown check ids', async () => {
			const registry = new WorkflowCheckRegistry();
			const service = new WorkflowAuthoringChecksService(registry, makeConfigRepo(), logger);

			expect(await service.updateConfig('ghost', { enabled: false })).toBeNull();
		});

		it('upserts and returns a merged DTO for a registered check', async () => {
			const registry = new WorkflowCheckRegistry();
			registry.register(makeCheck('a', 'A', [], 'warning'));
			const repo = makeConfigRepo();
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			const result = await service.updateConfig('a', {
				enabled: false,
				severityOverride: 'blocking',
			});

			expect(repo.upsertConfig).toHaveBeenCalledWith('a', {
				enabled: false,
				severityOverride: 'blocking',
			});
			expect(result).toEqual({
				checkId: 'a',
				title: 'A',
				description: '',
				defaultSeverity: 'warning',
				severityOverride: 'blocking',
				effectiveSeverity: 'blocking',
				enabled: false,
			});
		});
	});
});

describe('WorkflowCheckRegistry', () => {
	it('rejects duplicate check registration', () => {
		const registry = new WorkflowCheckRegistry();
		registry.register(makeCheck('dup', 'A', []));

		expect(() => registry.register(makeCheck('dup', 'B', []))).toThrow(/Duplicate/);
	});
});
