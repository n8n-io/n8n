import type { Mocked, MockedFunction } from 'vitest';
import type { AddDatasetRowDto } from '@n8n/api-types';
import type { EvaluationConfig, IExecutionResponse, User } from '@n8n/db';
import type { EvaluationConfigRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { IConnections, IRunData } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';

import { EvaluationDatasetService } from '../evaluation-dataset.service';

vi.mock('@/permissions.ee/check-access');
const userHasScopesMock = userHasScopes as MockedFunction<typeof userHasScopes>;

describe('EvaluationDatasetService', () => {
	let configRepository: Mocked<EvaluationConfigRepository>;
	let executionPersistence: Mocked<ExecutionPersistence>;
	let dataTableService: Mocked<DataTableService>;
	let sourceControlPreferencesService: Mocked<SourceControlPreferencesService>;
	let service: EvaluationDatasetService;

	const user = mock<User>({ id: 'user-1' });
	const WORKFLOW_ID = 'wf-1';
	const CONFIG_ID = 'cfg-1';
	const EXECUTION_ID = 'exec-1';
	const DATA_TABLE_ID = 'dt-1';
	const PROJECT_ID = 'proj-1';

	// Trigger -> Start -> End
	const connections: IConnections = {
		Trigger: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
		Start: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
	};

	function makeConfig(overrides: Partial<EvaluationConfig> = {}): EvaluationConfig {
		return {
			id: CONFIG_ID,
			workflowId: WORKFLOW_ID,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: DATA_TABLE_ID },
			startNodeName: 'Start',
			endNodeName: 'End',
			...overrides,
		} as EvaluationConfig;
	}

	function makeColumns(): DataTableColumn[] {
		return [
			{ name: 'question', type: 'string' },
			{ name: 'answer', type: 'string' },
			{ name: 'unmatched', type: 'string' },
		] as DataTableColumn[];
	}

	function nodeOutput(json: Record<string, unknown>) {
		return [{ data: { main: [[{ json }]] } }];
	}

	function makeExecution(options: {
		status?: string;
		mode?: string;
		runData?: IRunData;
		connections?: IConnections;
	}): IExecutionResponse {
		const runData =
			options.runData ??
			({
				// `Trigger` is the parent of the start node — its output is the slice input.
				Trigger: nodeOutput({ question: 'Q1', extra: 'x' }),
				End: nodeOutput({ answer: 'A1' }),
			} as unknown as IRunData);

		return {
			status: options.status ?? 'success',
			mode: options.mode ?? 'manual',
			workflowData: { nodes: [], connections: options.connections ?? connections },
			data: { resultData: { runData } },
		} as unknown as IExecutionResponse;
	}

	// The service loads execution data through ExecutionPersistence, which reads
	// from the store recorded in `storedAt` (db or fs).
	function mockExecution(execution: IExecutionResponse | undefined) {
		executionPersistence.findSingleExecution.mockResolvedValue(execution);
	}

	beforeEach(() => {
		vi.resetAllMocks();
		configRepository = mock<EvaluationConfigRepository>();
		executionPersistence = mock<ExecutionPersistence>();
		dataTableService = mock<DataTableService>();
		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		service = new EvaluationDatasetService(
			configRepository,
			executionPersistence,
			dataTableService,
			sourceControlPreferencesService,
		);

		configRepository.findByIdAndWorkflowId.mockResolvedValue(makeConfig());
		mockExecution(makeExecution({}));
		dataTableService.getProjectIdForDataTable.mockResolvedValue(PROJECT_ID);
		dataTableService.getColumns.mockResolvedValue(makeColumns());
		sourceControlPreferencesService.getPreferences.mockReturnValue({
			branchReadOnly: false,
		} as never);
		userHasScopesMock.mockReset();
		userHasScopesMock.mockResolvedValue(true);
	});

	describe('getCandidate', () => {
		it('returns columns, input/output fields and a name-matched suggested mapping', async () => {
			const result = await service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID);

			expect(result.dataTableId).toBe(DATA_TABLE_ID);
			expect(result.columns).toEqual([
				{ name: 'question', type: 'string' },
				{ name: 'answer', type: 'string' },
				{ name: 'unmatched', type: 'string' },
			]);
			// Inputs come from the start node's parent (Trigger) output.
			expect(result.fields.inputs).toEqual([
				{ key: 'question', sample: 'Q1' },
				{ key: 'extra', sample: 'x' },
			]);
			expect(result.fields.outputs).toEqual([{ key: 'answer', sample: 'A1' }]);
			expect(result.suggestedMapping).toEqual({
				question: { source: 'input', field: 'question' },
				answer: { source: 'output', field: 'answer' },
				unmatched: null,
			});
		});

		it('matches column names case-insensitively and prefers inputs over outputs', async () => {
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'Question', type: 'string' },
			] as DataTableColumn[]);
			mockExecution(
				makeExecution({
					runData: {
						Trigger: nodeOutput({ question: 'Q1' }),
						End: nodeOutput({ question: 'fromOutput' }),
					} as unknown as IRunData,
				}),
			);

			const result = await service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID);

			expect(result.suggestedMapping).toEqual({
				Question: { source: 'input', field: 'question' },
			});
		});

		it('falls back to the start node output when it has no parent', async () => {
			mockExecution(
				makeExecution({
					connections: {}, // no edges -> Start has no parent
					runData: {
						Start: nodeOutput({ question: 'fromStart' }),
						End: nodeOutput({ answer: 'A1' }),
					} as unknown as IRunData,
				}),
			);

			const result = await service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID);

			expect(result.fields.inputs).toEqual([{ key: 'question', sample: 'fromStart' }]);
		});

		it('throws NotFoundError when the config does not exist', async () => {
			configRepository.findByIdAndWorkflowId.mockResolvedValue(null);
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(NotFoundError);
		});

		it('throws BadRequestError when the config is not backed by a data table', async () => {
			configRepository.findByIdAndWorkflowId.mockResolvedValue(
				makeConfig({ datasetSource: 'google_sheets' }),
			);
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(BadRequestError);
		});

		it('throws NotFoundError when the execution does not exist', async () => {
			mockExecution(undefined);
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(NotFoundError);
		});

		it('throws BadRequestError when the execution is not successful', async () => {
			mockExecution(makeExecution({ status: 'error' }));
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(BadRequestError);
		});

		it('throws BadRequestError for evaluation-mode executions', async () => {
			mockExecution(makeExecution({ mode: 'evaluation' }));
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(BadRequestError);
		});

		it('throws BadRequestError when the execution has no stored run data', async () => {
			// Execution row exists (passes validation) but its data bundle has no run data.
			executionPersistence.findSingleExecution.mockResolvedValue({
				status: 'success',
				mode: 'manual',
				workflowData: { nodes: [], connections },
				data: { resultData: {} },
			} as unknown as IExecutionResponse);
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(BadRequestError);
			expect(dataTableService.getColumns).not.toHaveBeenCalled();
		});

		it('loads run data for the execution scoped to the workflow, reading from its store', async () => {
			await service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID);
			expect(executionPersistence.findSingleExecution).toHaveBeenCalledWith(EXECUTION_ID, {
				includeData: true,
				unflattenData: true,
				where: { workflowId: WORKFLOW_ID },
			});
		});

		it('enforces read access on the data table for the user', async () => {
			await service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID);
			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['dataTable:readRow'], false, {
				dataTableId: DATA_TABLE_ID,
			});
		});

		it('throws ForbiddenError when the user cannot read the data table', async () => {
			userHasScopesMock.mockResolvedValue(false);
			await expect(
				service.getCandidate(user, WORKFLOW_ID, CONFIG_ID, EXECUTION_ID),
			).rejects.toThrow(ForbiddenError);
			expect(dataTableService.getColumns).not.toHaveBeenCalled();
		});
	});

	describe('addRow', () => {
		it('throws ForbiddenError when the instance is in read-only (protected) mode', async () => {
			sourceControlPreferencesService.getPreferences.mockReturnValue({
				branchReadOnly: true,
			} as never);
			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: { question: { source: 'input', field: 'question' } },
			};

			await expect(service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto)).rejects.toThrow(
				ForbiddenError,
			);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('enforces write access on the data table and throws ForbiddenError when denied', async () => {
			userHasScopesMock.mockResolvedValue(false);
			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: { question: { source: 'input', field: 'question' } },
			};

			await expect(service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto)).rejects.toThrow(
				ForbiddenError,
			);
			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['dataTable:writeRow'], false, {
				dataTableId: DATA_TABLE_ID,
			});
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('inserts a single row built from the mapping and returns the inserted id', async () => {
			dataTableService.insertRows.mockResolvedValue([{ id: 7 }]);

			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: {
					question: { source: 'input', field: 'question' },
					answer: { source: 'output', field: 'answer' },
					unmatched: null,
				},
			};

			const result = await service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto);

			expect(dataTableService.insertRows).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				[{ question: 'Q1', answer: 'A1' }],
				'id',
			);
			expect(result).toEqual([{ id: 7 }]);
		});

		it('skips columns whose mapped field is no longer present on the execution', async () => {
			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: {
					question: { source: 'input', field: 'question' },
					answer: { source: 'output', field: 'gone' },
				},
			};

			await service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto);

			expect(dataTableService.insertRows).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				[{ question: 'Q1' }],
				'id',
			);
		});

		it('JSON-stringifies non-primitive values', async () => {
			mockExecution(
				makeExecution({
					runData: {
						Trigger: nodeOutput({ payload: { nested: true } }),
						End: nodeOutput({ answer: 'A1' }),
					} as unknown as IRunData,
				}),
			);
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'payload', type: 'string' },
			] as DataTableColumn[]);

			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: { payload: { source: 'input', field: 'payload' } },
			};

			await service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto);

			expect(dataTableService.insertRows).toHaveBeenCalledWith(
				DATA_TABLE_ID,
				PROJECT_ID,
				[{ payload: '{"nested":true}' }],
				'id',
			);
		});

		it('throws BadRequestError when an object is mapped to a non-string column', async () => {
			mockExecution(
				makeExecution({
					runData: {
						Trigger: nodeOutput({ payload: { nested: true } }),
						End: nodeOutput({ answer: 'A1' }),
					} as unknown as IRunData,
				}),
			);
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'payload', type: 'number' },
			] as DataTableColumn[]);

			const dto: AddDatasetRowDto = {
				executionId: EXECUTION_ID,
				mapping: { payload: { source: 'input', field: 'payload' } },
			};

			await expect(service.addRow(user, WORKFLOW_ID, CONFIG_ID, dto)).rejects.toThrow(
				BadRequestError,
			);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});
	});
});
