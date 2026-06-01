import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { IConnections, INode, IWorkflowBase } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { DataTable as DataTableEntity } from '@/modules/data-table/data-table.entity';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import {
	EvaluationConfigValidator,
	isCoercibleBooleanExpression,
} from '../evaluation-config-validator';
import type { LlmJudgeProviderRegistry } from '../llm-judge-provider-registry';

function makeNode(over: Partial<INode> & Pick<INode, 'name'>): INode {
	return {
		id: over.name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...over,
	} as INode;
}

function makeWorkflow(over: Partial<IWorkflowBase> = {}): IWorkflowBase {
	const trigger = makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' });
	const start = makeNode({ name: 'Start' });
	const end = makeNode({ name: 'End' });
	const connections: IConnections = {
		Trigger: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
		Start: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
	};
	return {
		id: 'wf-1',
		name: 'WF',
		active: false,
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		nodes: [trigger, start, end],
		connections,
		...over,
	} as IWorkflowBase;
}

const validLlmJudgeMetric = {
	id: 'm-llm',
	name: 'Helpful',
	type: 'llm_judge' as const,
	config: {
		preset: 'correctness' as const,
		prompt: 'Judge this',
		provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		credentialId: 'cred-1',
		model: 'gpt-4o',
		outputType: 'numeric' as const,
		inputs: {
			actualAnswer: '={{ $json.out }}',
			expectedAnswer: '={{ $json.expected }}',
		},
	},
};

function makeConfig(over: Partial<UpsertEvaluationConfigDto> = {}): UpsertEvaluationConfigDto {
	return {
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		startNodeName: 'Start',
		endNodeName: 'End',
		name: 'eval-config',
		metrics: [
			{
				id: 'm1',
				name: 'Accuracy',
				type: 'expression',
				config: { expression: '={{ 1 }}', outputType: 'numeric' },
			},
		],
		...over,
	} as UpsertEvaluationConfigDto;
}

function makeRegistry(): jest.Mocked<LlmJudgeProviderRegistry> {
	const registry = mock<LlmJudgeProviderRegistry>();
	registry.get.mockImplementation((nodeType) =>
		nodeType === '@n8n/n8n-nodes-langchain.lmChatOpenAi'
			? {
					nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					displayName: 'OpenAI Chat Model',
					credentialTypes: [{ name: 'openAiApi', displayName: 'OpenAI' }],
				}
			: undefined,
	);
	registry.listProviders.mockReturnValue([]);
	return registry;
}

function makeDataTableRepo(): jest.Mocked<DataTableRepository> {
	const repo = mock<DataTableRepository>();
	repo.findOne.mockResolvedValue({
		id: 'dt-1',
		name: 'DT',
		project: { id: 'proj-1' },
	} as unknown as DataTableEntity);
	return repo;
}

function makeCredentialsFinder(): jest.Mocked<CredentialsFinderService> {
	const finder = mock<CredentialsFinderService>();
	finder.findCredentialForUser.mockResolvedValue({
		id: 'cred-1',
		name: 'OpenAI',
		type: 'openAiApi',
	} as unknown as CredentialsEntity);
	return finder;
}

function makeUser(): User {
	return mock<User>({ id: 'user-1' });
}

describe('EvaluationConfigValidator', () => {
	let validator: EvaluationConfigValidator;
	let registry: jest.Mocked<LlmJudgeProviderRegistry>;
	let dataTableRepo: jest.Mocked<DataTableRepository>;
	let credentialsFinder: jest.Mocked<CredentialsFinderService>;

	beforeEach(() => {
		registry = makeRegistry();
		dataTableRepo = makeDataTableRepo();
		credentialsFinder = makeCredentialsFinder();
		validator = new EvaluationConfigValidator(dataTableRepo, credentialsFinder, registry);
	});

	it('returns an empty array for a valid config', async () => {
		const errors = await validator.validate({
			workflow: makeWorkflow(),
			config: makeConfig(),
			user: makeUser(),
		});
		expect(errors).toEqual([]);
	});

	describe('START_NODE_NOT_FOUND / END_NODE_NOT_FOUND', () => {
		it('emits START_NODE_NOT_FOUND when startNodeName is missing', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ startNodeName: 'DoesNotExist' }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'START_NODE_NOT_FOUND',
					details: { nodeName: 'DoesNotExist', field: 'startNodeName' },
				}),
			);
		});

		it('emits END_NODE_NOT_FOUND when endNodeName is missing', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ endNodeName: 'GhostNode' }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'END_NODE_NOT_FOUND',
					details: { nodeName: 'GhostNode', field: 'endNodeName' },
				}),
			);
		});

		it('emits both when both names are bad', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ startNodeName: 'X', endNodeName: 'Y' }),
				user: makeUser(),
			});
			const codes = errors.map((e) => e.code);
			expect(codes).toContain('START_NODE_NOT_FOUND');
			expect(codes).toContain('END_NODE_NOT_FOUND');
		});
	});

	describe('RESERVED_PREFIX_IN_USE', () => {
		it('emits one error per offending node', async () => {
			const wf = makeWorkflow({
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: '__eval_metric_old' }),
					makeNode({ name: 'Start' }),
					makeNode({ name: '__eval_trigger' }),
					makeNode({ name: 'End' }),
				],
			});
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig(),
				user: makeUser(),
			});
			const offenders = errors
				.filter((e) => e.code === 'RESERVED_PREFIX_IN_USE')
				.map((e) => e.details?.nodeName)
				.sort();
			expect(offenders).toEqual(['__eval_metric_old', '__eval_trigger']);
		});

		it('does not emit when no node uses the reserved prefix', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'RESERVED_PREFIX_IN_USE')).toBeUndefined();
		});
	});

	describe('AMBIGUOUS_ENTRY_NODE', () => {
		it('emits when startNodeName has multiple main upstream parents', async () => {
			const wf: IWorkflowBase = {
				...makeWorkflow(),
				nodes: [
					makeNode({ name: 'TriggerA', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'TriggerB', type: 'n8n-nodes-base.cron' }),
					makeNode({ name: 'Start' }),
					makeNode({ name: 'End' }),
				],
				connections: {
					TriggerA: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
					TriggerB: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
					Start: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
				},
			};
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'AMBIGUOUS_ENTRY_NODE',
					details: { nodeName: 'Start' },
				}),
			);
		});

		it('does not emit for a single-parent entry', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'AMBIGUOUS_ENTRY_NODE')).toBeUndefined();
		});

		it('does not emit when entry has zero parents (entry is a trigger)', async () => {
			const wf: IWorkflowBase = {
				...makeWorkflow(),
				nodes: [
					makeNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'End' }),
				],
				connections: { Start: { main: [[{ node: 'End', type: 'main', index: 0 }]] } },
			};
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'AMBIGUOUS_ENTRY_NODE')).toBeUndefined();
		});
	});

	describe('END_NODE_UNREACHABLE', () => {
		it('emits when end has no main path from start', async () => {
			const wf: IWorkflowBase = {
				...makeWorkflow(),
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'Start' }),
					makeNode({ name: 'OrphanEnd' }),
				],
				connections: {
					Trigger: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
				},
			};
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig({ endNodeName: 'OrphanEnd' }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'END_NODE_UNREACHABLE',
					details: { nodeName: 'OrphanEnd', field: 'endNodeName' },
				}),
			);
		});

		it('does not emit when start === end', async () => {
			const wf: IWorkflowBase = {
				...makeWorkflow(),
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'Agent' }),
				],
				connections: { Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] } },
			};
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig({ startNodeName: 'Agent', endNodeName: 'Agent' }),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'END_NODE_UNREACHABLE')).toBeUndefined();
		});

		it('does not emit when end is multiple hops downstream', async () => {
			const wf: IWorkflowBase = {
				...makeWorkflow(),
				nodes: [
					makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ name: 'Start' }),
					makeNode({ name: 'Mid' }),
					makeNode({ name: 'End' }),
				],
				connections: {
					Trigger: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
					Start: { main: [[{ node: 'Mid', type: 'main', index: 0 }]] },
					Mid: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
				},
			};
			const errors = await validator.validate({
				workflow: wf,
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'END_NODE_UNREACHABLE')).toBeUndefined();
		});

		it('skips when start or end is missing', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ endNodeName: 'GhostEnd' }),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'END_NODE_UNREACHABLE')).toBeUndefined();
		});
	});

	describe('DATASET_NOT_FOUND / DATASET_ACCESS_DENIED', () => {
		it('emits DATASET_NOT_FOUND when the data table does not exist', async () => {
			dataTableRepo.findOne.mockResolvedValue(null);
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'DATASET_NOT_FOUND',
					details: expect.objectContaining({ field: 'datasetRef.dataTableId' }),
				}),
			);
		});

		it('does not check the data table when datasetSource is google_sheets', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					datasetSource: 'google_sheets',
					datasetRef: {
						credentialId: 'cred-1',
						spreadsheetId: 'abc',
						sheetName: 'Sheet1',
					},
				}),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'DATASET_NOT_FOUND')).toBeUndefined();
			expect(dataTableRepo.findOne).not.toHaveBeenCalled();
		});
	});

	describe('UNSUPPORTED_DATASET_SOURCE', () => {
		it('emits when datasetSource is google_sheets', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					datasetSource: 'google_sheets',
					datasetRef: {
						credentialId: 'cred-1',
						spreadsheetId: 'abc',
						sheetName: 'Sheet1',
					},
				}),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({ code: 'UNSUPPORTED_DATASET_SOURCE' }),
			);
		});

		it('does not emit when datasetSource is data_table', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig(),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'UNSUPPORTED_DATASET_SOURCE')).toBeUndefined();
		});
	});

	describe('LLM_PROVIDER_UNSUPPORTED', () => {
		it('emits when the metric provider is not in the registry', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					metrics: [
						{
							...validLlmJudgeMetric,
							config: {
								...validLlmJudgeMetric.config,
								provider: '@n8n/n8n-nodes-langchain.lmChatNotARealNode',
							},
						},
					],
				}),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'LLM_PROVIDER_UNSUPPORTED',
					details: expect.objectContaining({
						nodeType: '@n8n/n8n-nodes-langchain.lmChatNotARealNode',
						metricId: 'm-llm',
					}),
				}),
			);
		});

		it('does not emit for a known provider', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric] }),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'LLM_PROVIDER_UNSUPPORTED')).toBeUndefined();
		});
	});

	describe('LLM_CREDENTIAL_*', () => {
		it('emits LLM_CREDENTIAL_ACCESS_DENIED when finder returns null', async () => {
			credentialsFinder.findCredentialForUser.mockResolvedValueOnce(null);
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric] }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'LLM_CREDENTIAL_ACCESS_DENIED',
					details: expect.objectContaining({ credentialId: 'cred-1', metricId: 'm-llm' }),
				}),
			);
		});

		it('emits LLM_CREDENTIAL_TYPE_MISMATCH when type does not match provider', async () => {
			credentialsFinder.findCredentialForUser.mockResolvedValueOnce({
				id: 'cred-1',
				name: 'Wrong',
				type: 'anthropicApi',
			} as unknown as CredentialsEntity);
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric] }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'LLM_CREDENTIAL_TYPE_MISMATCH',
					details: expect.objectContaining({ credentialId: 'cred-1', metricId: 'm-llm' }),
				}),
			);
		});

		it('does not emit when the credential is accessible and the type matches', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric] }),
				user: makeUser(),
			});
			expect(
				errors.find((e) =>
					['LLM_CREDENTIAL_ACCESS_DENIED', 'LLM_CREDENTIAL_TYPE_MISMATCH'].includes(e.code),
				),
			).toBeUndefined();
		});

		it('skips credential check when provider is unsupported (already errored)', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					metrics: [
						{
							...validLlmJudgeMetric,
							config: {
								...validLlmJudgeMetric.config,
								provider: '@n8n/n8n-nodes-langchain.unknown',
							},
						},
					],
				}),
				user: makeUser(),
			});
			expect(
				errors.find((e) =>
					['LLM_CREDENTIAL_ACCESS_DENIED', 'LLM_CREDENTIAL_TYPE_MISMATCH'].includes(e.code),
				),
			).toBeUndefined();
		});
	});

	describe('DUPLICATE_METRIC_ID / DUPLICATE_METRIC_NAME', () => {
		it('emits DUPLICATE_METRIC_ID for repeated ids', async () => {
			const dupMetric = { ...validLlmJudgeMetric, name: 'Other' };
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric, dupMetric] }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'DUPLICATE_METRIC_ID',
					details: expect.objectContaining({ metricId: 'm-llm' }),
				}),
			);
		});

		it('emits DUPLICATE_METRIC_NAME for repeated names', async () => {
			const second = {
				...validLlmJudgeMetric,
				id: 'm-llm-2',
			};
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({ metrics: [validLlmJudgeMetric, second] }),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'DUPLICATE_METRIC_NAME',
					details: expect.objectContaining({ metricName: 'Helpful' }),
				}),
			);
		});
	});

	describe('BOOLEAN_COERCION_UNSUPPORTED', () => {
		it('emits when an expression metric with boolean output mixes literal text and an expression', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					metrics: [
						{
							id: 'm-bad',
							name: 'Bad',
							type: 'expression',
							config: {
								expression: '=foo {{$json.a}} bar {{$json.b}}',
								outputType: 'boolean',
							},
						},
					],
				}),
				user: makeUser(),
			});
			expect(errors).toContainEqual(
				expect.objectContaining({
					code: 'BOOLEAN_COERCION_UNSUPPORTED',
					details: expect.objectContaining({ metricId: 'm-bad' }),
				}),
			);
		});

		it('does not emit for clean single-segment boolean expressions', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					metrics: [
						{
							id: 'm-ok',
							name: 'OK',
							type: 'expression',
							config: { expression: '={{ $json.a === $json.b }}', outputType: 'boolean' },
						},
					],
				}),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'BOOLEAN_COERCION_UNSUPPORTED')).toBeUndefined();
		});

		it('does not emit when outputType is numeric (coercion not needed)', async () => {
			const errors = await validator.validate({
				workflow: makeWorkflow(),
				config: makeConfig({
					metrics: [
						{
							id: 'm-num',
							name: 'Num',
							type: 'expression',
							config: { expression: '=foo {{$json.a}} bar {{$json.b}}', outputType: 'numeric' },
						},
					],
				}),
				user: makeUser(),
			});
			expect(errors.find((e) => e.code === 'BOOLEAN_COERCION_UNSUPPORTED')).toBeUndefined();
		});
	});
});

describe('isCoercibleBooleanExpression', () => {
	it.each([
		['=true', true],
		['=false', true],
		['={{ $json.a === 1 }}', true],
		['plain literal', true],
		['={{ $json.a }} {{ $json.b }}', false],
		['=foo {{ $json.a }} bar', false],
	])('handles %s', (expression, expected) => {
		expect(isCoercibleBooleanExpression(expression)).toBe(expected);
	});
});
