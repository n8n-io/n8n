import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { WorkflowCheck } from '../database/entities/workflow-check.entity';
import type { WorkflowCheckRepository } from '../database/repositories/workflow-check.repository';
import { WORKFLOW_CHECK_TYPES } from '../workflow-authoring-checks.constants';
import { WorkflowAuthoringChecksService } from '../workflow-authoring-checks.service';
import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowCheckType,
	WorkflowCheckViolation,
} from '../workflow-authoring-checks.types';
import { WorkflowCheckRegistry } from '../workflow-check-registry.service';

const makeType = (
	overrides: Partial<WorkflowCheckType> & Pick<WorkflowCheckType, 'evaluate'>,
): WorkflowCheckType => ({
	type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
	title: 'Node has direct parent',
	description: '',
	defaultSeverity: 'warning',
	configSchema: { fields: [] },
	validateConfig: jest.fn().mockImplementation((c: unknown) => c),
	...overrides,
});

const makeInstance = (overrides: Partial<WorkflowCheck> = {}): WorkflowCheck =>
	({
		id: 'instance-1',
		name: 'My check',
		type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
		config: { foo: 'bar' },
		enabled: true,
		severity: 'warning',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as WorkflowCheck;

const emptyInput: RunWorkflowAuthoringChecksInput = {
	workflowId: 'wf-1',
	nodes: [],
	connections: {},
	settings: undefined,
};

const makeRepo = (instances: WorkflowCheck[] = []) =>
	mock<WorkflowCheckRepository>({
		findAllOrdered: jest.fn().mockResolvedValue(instances),
		findOne: jest
			.fn()
			.mockImplementation(
				async ({ where: { id } }: { where: { id: string } }) =>
					instances.find((i) => i.id === id) ?? null,
			),
		createInstance: jest
			.fn()
			.mockImplementation(async (input) => ({
				id: 'new-1',
				...input,
				enabled: input.enabled ?? true,
			})),
		updateInstance: jest.fn(),
		deleteById: jest.fn().mockResolvedValue(true),
	});

describe('WorkflowAuthoringChecksService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	logger.warn.mockReturnValue(undefined);

	describe('runAll', () => {
		it('returns no results when there are no enabled instances', async () => {
			const registry = new WorkflowCheckRegistry();
			const service = new WorkflowAuthoringChecksService(registry, makeRepo([]), logger);

			expect(await service.runAll(emptyInput)).toEqual([]);
		});

		it('skips instances with unknown types', async () => {
			const registry = new WorkflowCheckRegistry();
			const repo = makeRepo([makeInstance({ id: 'x', type: 'node-has-direct-parent' })]);
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			expect(await service.runAll(emptyInput)).toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping workflow check with unknown type',
				expect.objectContaining({ instanceId: 'x' }),
			);
		});

		it('skips instances whose config fails validation', async () => {
			const registry = new WorkflowCheckRegistry();
			const evaluate = jest.fn();
			registry.register(
				makeType({
					validateConfig: jest.fn().mockImplementation(() => {
						throw new UserError('bad config');
					}),
					evaluate,
				}),
			);
			const service = new WorkflowAuthoringChecksService(
				registry,
				makeRepo([makeInstance()]),
				logger,
			);

			expect(await service.runAll(emptyInput)).toEqual([]);
			expect(evaluate).not.toHaveBeenCalled();
		});

		it('returns violations keyed by check instance id', async () => {
			const registry = new WorkflowCheckRegistry();
			const violations: WorkflowCheckViolation[] = [{ message: 'v', nodeIds: ['n1'] }];
			registry.register(makeType({ evaluate: jest.fn().mockResolvedValue(violations) }));
			const service = new WorkflowAuthoringChecksService(
				registry,
				makeRepo([makeInstance({ id: 'inst-1', name: 'Rule A', severity: 'blocking' })]),
				logger,
			);

			expect(await service.runAll(emptyInput)).toEqual([
				{
					checkInstanceId: 'inst-1',
					type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
					name: 'Rule A',
					severity: 'blocking',
					violations,
				},
			]);
		});

		it('skips disabled instances', async () => {
			const registry = new WorkflowCheckRegistry();
			const evaluate = jest.fn().mockResolvedValue([{ message: 'v' }]);
			registry.register(makeType({ evaluate }));
			const service = new WorkflowAuthoringChecksService(
				registry,
				makeRepo([makeInstance({ enabled: false })]),
				logger,
			);

			expect(await service.runAll(emptyInput)).toEqual([]);
			expect(evaluate).not.toHaveBeenCalled();
		});
	});

	describe('listTypes', () => {
		it('returns the registered check types', () => {
			const registry = new WorkflowCheckRegistry();
			registry.register(makeType({ evaluate: jest.fn() }));
			const service = new WorkflowAuthoringChecksService(registry, makeRepo(), logger);

			expect(service.listTypes()).toEqual([
				expect.objectContaining({
					type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
					title: 'Node has direct parent',
					defaultSeverity: 'warning',
				}),
			]);
		});
	});

	describe('listInstances', () => {
		it('returns instances merged with their type titles', async () => {
			const registry = new WorkflowCheckRegistry();
			registry.register(makeType({ evaluate: jest.fn() }));
			const service = new WorkflowAuthoringChecksService(
				registry,
				makeRepo([makeInstance({ id: 'i-1', name: 'Rule A' })]),
				logger,
			);

			expect(await service.listInstances()).toEqual([
				expect.objectContaining({
					id: 'i-1',
					name: 'Rule A',
					type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
					typeTitle: 'Node has direct parent',
				}),
			]);
		});
	});

	describe('createInstance', () => {
		it('throws when type is unknown', async () => {
			const registry = new WorkflowCheckRegistry();
			const service = new WorkflowAuthoringChecksService(registry, makeRepo(), logger);

			await expect(
				service.createInstance({
					name: 'x',
					type: 'unknown',
					config: {},
					severity: 'warning',
				}),
			).rejects.toThrow(/Unknown workflow check type/);
		});

		it('validates the config before creating', async () => {
			const registry = new WorkflowCheckRegistry();
			const validateConfig = jest.fn().mockImplementation(() => {
				throw new UserError('no good');
			});
			registry.register(makeType({ validateConfig, evaluate: jest.fn() }));
			const repo = makeRepo();
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			await expect(
				service.createInstance({
					name: 'x',
					type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
					config: {},
					severity: 'warning',
				}),
			).rejects.toThrow(/no good/);
			expect(repo.createInstance).not.toHaveBeenCalled();
		});

		it('persists the validated instance and returns a DTO', async () => {
			const registry = new WorkflowCheckRegistry();
			registry.register(makeType({ evaluate: jest.fn() }));
			const repo = makeRepo();
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			const dto = await service.createInstance({
				name: 'Rule',
				type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
				config: { childNodeType: 'a', parentNodeType: 'b' },
				severity: 'blocking',
			});

			expect(repo.createInstance).toHaveBeenCalledWith({
				name: 'Rule',
				type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
				config: { childNodeType: 'a', parentNodeType: 'b' },
				severity: 'blocking',
				enabled: undefined,
			});
			expect(dto).toEqual(
				expect.objectContaining({
					name: 'Rule',
					type: WORKFLOW_CHECK_TYPES.NodeHasDirectParent,
					typeTitle: 'Node has direct parent',
					severity: 'blocking',
				}),
			);
		});
	});

	describe('updateInstance', () => {
		it('returns null when the instance is missing', async () => {
			const registry = new WorkflowCheckRegistry();
			const service = new WorkflowAuthoringChecksService(registry, makeRepo([]), logger);

			expect(await service.updateInstance('missing', { enabled: false })).toBeNull();
		});

		it('re-validates the config when provided', async () => {
			const registry = new WorkflowCheckRegistry();
			const validateConfig = jest.fn().mockReturnValue({ ok: true });
			registry.register(makeType({ validateConfig, evaluate: jest.fn() }));
			const existing = makeInstance({ id: 'i-1' });
			const repo = makeRepo([existing]);
			repo.updateInstance.mockResolvedValue({
				...existing,
				config: { childNodeType: 'a', parentNodeType: 'c' },
			});
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			await service.updateInstance('i-1', {
				config: { childNodeType: 'a', parentNodeType: 'c' },
			});

			expect(validateConfig).toHaveBeenCalledWith({ childNodeType: 'a', parentNodeType: 'c' });
			expect(repo.updateInstance).toHaveBeenCalledWith('i-1', {
				name: undefined,
				config: { childNodeType: 'a', parentNodeType: 'c' },
				severity: undefined,
				enabled: undefined,
			});
		});
	});

	describe('deleteInstance', () => {
		it('delegates to the repository', async () => {
			const registry = new WorkflowCheckRegistry();
			const repo = makeRepo();
			const service = new WorkflowAuthoringChecksService(registry, repo, logger);

			expect(await service.deleteInstance('i-1')).toBe(true);
			expect(repo.deleteById).toHaveBeenCalledWith('i-1');
		});
	});
});

describe('WorkflowCheckRegistry', () => {
	it('rejects duplicate type registration', () => {
		const registry = new WorkflowCheckRegistry();
		const type = makeType({ evaluate: jest.fn() });
		registry.register(type);

		expect(() => registry.register(type)).toThrow(/Duplicate/);
	});
});
