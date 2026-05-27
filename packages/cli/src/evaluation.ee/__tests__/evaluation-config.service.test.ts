import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { EvaluationConfig, EvaluationConfigRepository } from '@n8n/db';
import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EvaluationConfigValidator } from '../evaluation-config-validator';
import { EvaluationConfigService } from '../evaluation-config.service';

function makePayload(over: Partial<UpsertEvaluationConfigDto> = {}): UpsertEvaluationConfigDto {
	return {
		name: 'eval',
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		startNodeName: 'Start',
		endNodeName: 'End',
		metrics: [
			{
				id: 'm1',
				name: 'A',
				type: 'expression',
				config: { expression: '={{ 1 }}', outputType: 'numeric' },
			},
		],
		...over,
	} as UpsertEvaluationConfigDto;
}

function makeUser(): User {
	return mock<User>({ id: 'user-1' });
}

function makeWorkflow(): WorkflowEntity {
	return mock<WorkflowEntity>({ id: 'wf-1', nodes: [], connections: {} });
}

describe('EvaluationConfigService', () => {
	let service: EvaluationConfigService;
	let repository: jest.Mocked<EvaluationConfigRepository>;
	let validator: jest.Mocked<EvaluationConfigValidator>;
	let licenseState: jest.Mocked<LicenseState>;
	let workflow: WorkflowEntity;

	beforeEach(() => {
		repository = mock<EvaluationConfigRepository>();
		validator = mock<EvaluationConfigValidator>();
		licenseState = mock<LicenseState>();
		workflow = makeWorkflow();

		repository.listByWorkflowId.mockResolvedValue([]);
		repository.countDistinctWorkflowsWithConfigs.mockResolvedValue(0);
		repository.findByIdAndWorkflowId.mockResolvedValue(null);
		licenseState.getMaxWorkflowsWithEvaluations.mockReturnValue(10);
		validator.validate.mockResolvedValue([]);

		service = new EvaluationConfigService(repository, validator, licenseState);
	});

	describe('list', () => {
		it('passes through to repository.listByWorkflowId', async () => {
			const rows = [{ id: 'c1' }] as EvaluationConfig[];
			repository.listByWorkflowId.mockResolvedValueOnce(rows);
			expect(await service.list('wf-1')).toBe(rows);
			expect(repository.listByWorkflowId).toHaveBeenCalledWith('wf-1');
		});
	});

	describe('get', () => {
		it('returns null when the repo returns null', async () => {
			repository.findByIdAndWorkflowId.mockResolvedValueOnce(null);
			expect(await service.get('wf-1', 'cfg-1')).toBeNull();
		});

		it('returns the config when ids match', async () => {
			const row = { id: 'cfg-1', workflowId: 'wf-1' } as EvaluationConfig;
			repository.findByIdAndWorkflowId.mockResolvedValueOnce(row);
			expect(await service.get('wf-1', 'cfg-1')).toBe(row);
		});
	});

	describe('create', () => {
		it('runs validator, creates, and returns the entity', async () => {
			const payload = makePayload();
			const persisted = { id: 'cfg-1', workflowId: 'wf-1', ...payload } as EvaluationConfig;
			repository.createForWorkflow.mockResolvedValueOnce(persisted);

			const result = await service.create('wf-1', workflow, makeUser(), payload);

			expect(validator.validate).toHaveBeenCalledTimes(1);
			expect(repository.createForWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				'wf-1',
				payload,
			);
			expect(result).toBe(persisted);
		});

		it('throws EVALUATION_QUOTA_EXCEEDED when adding a first config exceeds the limit', async () => {
			licenseState.getMaxWorkflowsWithEvaluations.mockReturnValueOnce(2);
			repository.countDistinctWorkflowsWithConfigs.mockResolvedValueOnce(2);

			await expect(
				service.create('wf-1', workflow, makeUser(), makePayload()),
			).rejects.toMatchObject({ code: 'EVALUATION_QUOTA_EXCEEDED' });
			expect(repository.createForWorkflow).not.toHaveBeenCalled();
		});

		it('does not check quota when the workflow already has at least one config', async () => {
			licenseState.getMaxWorkflowsWithEvaluations.mockReturnValueOnce(2);
			repository.countDistinctWorkflowsWithConfigs.mockResolvedValueOnce(2);
			repository.listByWorkflowId.mockResolvedValueOnce([
				{ id: 'existing', workflowId: 'wf-1' } as EvaluationConfig,
			]);
			repository.createForWorkflow.mockResolvedValueOnce({ id: 'cfg-2' } as EvaluationConfig);

			await expect(
				service.create('wf-1', workflow, makeUser(), makePayload({ name: 'second' })),
			).resolves.toBeDefined();
			expect(repository.createForWorkflow).toHaveBeenCalled();
		});

		it('propagates validator errors as EvaluationApiError without creating', async () => {
			validator.validate.mockResolvedValueOnce([
				{
					code: 'START_NODE_NOT_FOUND',
					message: 'Start node "X" not found',
					details: { nodeName: 'X', field: 'startNodeName' },
				},
			]);

			await expect(
				service.create('wf-1', workflow, makeUser(), makePayload()),
			).rejects.toMatchObject({ code: 'START_NODE_NOT_FOUND' });
			expect(repository.createForWorkflow).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('runs validator, updates, and returns the entity', async () => {
			const payload = makePayload({ name: 'New' });
			const persisted = { id: 'cfg-1', workflowId: 'wf-1', ...payload } as EvaluationConfig;
			repository.updateForWorkflow.mockResolvedValueOnce(persisted);

			const result = await service.update('wf-1', 'cfg-1', workflow, makeUser(), payload);

			expect(validator.validate).toHaveBeenCalledTimes(1);
			expect(repository.updateForWorkflow).toHaveBeenCalledWith('cfg-1', 'wf-1', payload);
			expect(result).toBe(persisted);
		});

		it('throws CONFIG_NOT_FOUND when the repo returns null', async () => {
			repository.updateForWorkflow.mockResolvedValueOnce(null);
			await expect(
				service.update('wf-1', 'cfg-1', workflow, makeUser(), makePayload()),
			).rejects.toMatchObject({ code: 'CONFIG_NOT_FOUND' });
		});

		it('propagates validator errors as EvaluationApiError without updating', async () => {
			validator.validate.mockResolvedValueOnce([
				{ code: 'END_NODE_NOT_FOUND', message: 'gone', details: { nodeName: 'X' } },
			]);
			await expect(
				service.update('wf-1', 'cfg-1', workflow, makeUser(), makePayload()),
			).rejects.toMatchObject({ code: 'END_NODE_NOT_FOUND' });
			expect(repository.updateForWorkflow).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('passes through to repository.deleteByIdAndWorkflowId', async () => {
			repository.deleteByIdAndWorkflowId.mockResolvedValueOnce(1);
			await service.delete('wf-1', 'cfg-1');
			expect(repository.deleteByIdAndWorkflowId).toHaveBeenCalledWith('cfg-1', 'wf-1');
		});
	});

	describe('markInvalid', () => {
		it('passes through to repository.markInvalid', async () => {
			await service.markInvalid('cfg-1', 'END_NODE_DELETED');
			expect(repository.markInvalid).toHaveBeenCalledWith('cfg-1', 'END_NODE_DELETED');
		});
	});
});
