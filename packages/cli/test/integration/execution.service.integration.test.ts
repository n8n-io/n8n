import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionSummaries, User } from '@n8n/db';
import { ExecutionMetadataRepository, ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExecutionService } from '@/executions/execution.service';

import { annotateExecution, createAnnotationTags, createExecution } from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';

describe('ExecutionService', () => {
	let executionService: ExecutionService;
	let executionRepository: ExecutionRepository;
	let member: User;
	let owner: User;
	const globalConfig = Container.get(GlobalConfig);

	beforeAll(async () => {
		await testDb.init();

		executionRepository = Container.get(ExecutionRepository);

		executionService = new ExecutionService(
			globalConfig,
			mock(),
			mock(),
			mock(),
			mock(),
			executionRepository,
			mock(),
			mock(),
			Container.get(WorkflowRepository),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);

		owner = await createOwner();
		member = await createMember();
	});

	beforeEach(() => {
		globalConfig.executions.concurrency.productionLimit = -1;
		globalConfig.executions.mode = 'regular';
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findRangeWithCount', () => {
		test('should return execution summaries', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			const summaryShape = {
				id: expect.any(String),
				workflowId: expect.any(String),
				mode: expect.any(String),
				retryOf: null,
				status: expect.any(String),
				createdAt: expect.any(String),
				startedAt: expect.any(String),
				stoppedAt: expect.any(String),
				waitTill: null,
				retrySuccessId: null,
				workflowName: expect.any(String),
				annotation: {
					tags: expect.arrayContaining([]),
					vote: null,
				},
			};

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([summaryShape, summaryShape]);
		});

		test('should limit executions', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 2 },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(3);
			expect(output.estimated).toBe(false);
			expect(output.results).toHaveLength(2);
		});

		test('should retrieve executions before `lastId`, excluding it', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const [firstId, secondId] = await executionRepository.getAllIds();

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20, lastId: secondId },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(4);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([expect.objectContaining({ id: firstId })]),
			);
		});

		test('should retrieve executions after `firstId`, excluding it', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const [firstId, secondId, thirdId, fourthId] = await executionRepository.getAllIds();

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20, firstId },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(4);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: fourthId }),
					expect.objectContaining({ id: thirdId }),
					expect.objectContaining({ id: secondId }),
				]),
			);
		});

		test('should filter executions by `status`', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'waiting' }, workflow),
				createExecution({ status: 'waiting' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ status: 'success' }),
				expect.objectContaining({ status: 'success' }),
			]);
		});

		test('should filter executions by `workflowId`', async () => {
			const firstWorkflow = await createWorkflow({}, owner);
			const secondWorkflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, firstWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
				createExecution({ status: 'success' }, secondWorkflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: firstWorkflow.id,
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([expect.objectContaining({ workflowId: firstWorkflow.id })]),
			);
		});

		test('should filter executions by `startedBefore`', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedBefore: '2020-07-01',
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-06-01T00:00:00.000Z' }),
			]);
		});

		test('should filter executions by `startedAfter`', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ startedAt: new Date('2020-06-01') }, workflow),
				createExecution({ startedAt: new Date('2020-12-31') }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				startedAfter: '2020-07-01',
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				expect.objectContaining({ startedAt: '2020-12-31T00:00:00.000Z' }),
			]);
		});

		test('should filter executions by `metadata` with an exact match by default', async () => {
			const workflow = await createWorkflow({}, owner);

			const key = 'myKey';
			const value = 'myValue';

			await Promise.all([
				createExecution({ status: 'success', metadata: [{ key, value }] }, workflow),
				createExecution({ status: 'error', metadata: [{ key, value: `${value}2` }] }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
				metadata: [{ key, value, exactMatch: true }],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 1,
				estimated: false,
				results: [expect.objectContaining({ status: 'success' })],
			});
		});

		test('should filter executions by `metadata` with a partial match', async () => {
			const workflow = await createWorkflow({}, owner);

			const key = 'myKey';

			await Promise.all([
				createExecution({ status: 'success', metadata: [{ key, value: 'myValue' }] }, workflow),
				createExecution({ status: 'error', metadata: [{ key, value: 'var' }] }, workflow),
				createExecution({ status: 'success', metadata: [{ key, value: 'evaluation' }] }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
				metadata: [{ key, value: 'val', exactMatch: false }],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 2,
				estimated: false,
				results: [
					expect.objectContaining({ status: 'success' }),
					expect.objectContaining({ status: 'success' }),
				],
			});
		});

		test('should filter executions by `projectId`', async () => {
			const firstProject = await createTeamProject();
			const secondProject = await createTeamProject();

			const firstWorkflow = await createWorkflow(undefined, firstProject);
			const secondWorkflow = await createWorkflow(undefined, secondProject);

			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'success' }, secondWorkflow); // to filter out

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
				projectId: firstProject.id,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 2,
				estimated: false,
				results: expect.arrayContaining([
					expect.objectContaining({ workflowId: firstWorkflow.id }),
					expect.objectContaining({ workflowId: firstWorkflow.id }),
					// execution for workflow in second project was filtered out
				]),
			});
		});

		test('should filter executions by `projectId` and expected `status`', async () => {
			const firstProject = await createTeamProject();
			const secondProject = await createTeamProject();

			const firstWorkflow = await createWorkflow(undefined, firstProject);
			const secondWorkflow = await createWorkflow(undefined, secondProject);

			await createExecution({ status: 'success' }, firstWorkflow);
			await createExecution({ status: 'error' }, firstWorkflow);
			await createExecution({ status: 'success' }, secondWorkflow);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
				projectId: firstProject.id,
				status: ['error'],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output).toEqual({
				count: 1,
				estimated: false,
				results: expect.arrayContaining([
					expect.objectContaining({ workflowId: firstWorkflow.id, status: 'error' }),
				]),
			});
		});

		test.each([
			{
				name: 'waitTill',
				filter: { waitTill: true },
				matchingParams: { waitTill: new Date() },
				nonMatchingParams: { waitTill: undefined },
			},
			{
				name: 'metadata',
				filter: { metadata: [{ key: 'testKey', value: 'testValue' }] },
				matchingParams: { metadata: [{ key: 'testKey', value: 'testValue' }] },
				nonMatchingParams: { metadata: [{ key: 'otherKey', value: 'otherValue' }] },
			},
			{
				name: 'startedAfter',
				filter: { startedAfter: '2023-01-01' },
				matchingParams: { startedAt: new Date('2023-06-01') },
				nonMatchingParams: { startedAt: new Date('2022-01-01') },
			},
			{
				name: 'startedBefore',
				filter: { startedBefore: '2023-12-31' },
				matchingParams: { startedAt: new Date('2023-06-01') },
				nonMatchingParams: { startedAt: new Date('2024-01-01') },
			},
		])(
			'should filter executions by `projectId` and expected `$name`',
			async ({ filter, matchingParams, nonMatchingParams }) => {
				const firstProject = await createTeamProject();
				const secondProject = await createTeamProject();

				const firstWorkflow = await createWorkflow(undefined, firstProject);
				const secondWorkflow = await createWorkflow(undefined, secondProject);

				await Promise.all([
					createExecution(matchingParams, firstWorkflow),
					createExecution(nonMatchingParams, secondWorkflow),
				]);

				const query: ExecutionSummaries.RangeQuery = {
					kind: 'range',
					range: { limit: 20 },
					user: owner,
					projectId: firstProject.id,
					...filter,
				};

				const output = await executionService.findRangeWithCount(query);

				expect(output).toEqual({
					count: 1,
					estimated: false,
					results: expect.arrayContaining([
						expect.objectContaining({ workflowId: firstWorkflow.id }),
					]),
				});
			},
		);

		test('should exclude executions by inaccessible `workflowId`', async () => {
			const accessibleWorkflow = await createWorkflow({}, member);
			const inaccessibleWorkflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, accessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: inaccessibleWorkflow.id,
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([]);
		});

		test('should support advanced filters', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([createExecution({}, workflow), createExecution({}, workflow)]);

			const [firstId, secondId] = await executionRepository.getAllIds();

			const executionMetadataRepository = Container.get(ExecutionMetadataRepository);

			await executionMetadataRepository.save({
				key: 'key1',
				value: 'value1',
				execution: { id: firstId },
			});

			await executionMetadataRepository.save({
				key: 'key2',
				value: 'value2',
				execution: { id: secondId },
			});

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				metadata: [{ key: 'key1', value: 'value1' }],
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([expect.objectContaining({ id: firstId })]);
		});
	});

	describe('findRangeWithCount — subquery approach', () => {
		test('should scope results to user accessible workflows', async () => {
			const workflow1 = await createWorkflow({}, member);
			const workflow2 = await createWorkflow({}, member);
			const inaccessibleWorkflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, workflow1),
				createExecution({ status: 'success' }, workflow1),
				createExecution({ status: 'error' }, workflow2),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			};

			const result = await executionService.findRangeWithCount(query);

			// member owns workflow1 and workflow2 → sees 3 executions, not the inaccessible one
			expect(result.count).toBe(3);
			const workflowIds = result.results.map((r) => r.workflowId);
			expect(workflowIds).toContain(workflow1.id);
			expect(workflowIds).toContain(workflow2.id);
			expect(workflowIds).not.toContain(inaccessibleWorkflow.id);
		});

		test('should filter by status correctly', async () => {
			const workflow = await createWorkflow({}, member);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'error' }, workflow),
			]);

			const arrayQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				status: ['success'],
				user: owner,
			};

			const subqueryQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				status: ['success'],
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			};

			const [arrayResult, subqueryResult] = await Promise.all([
				executionService.findRangeWithCount(arrayQuery),
				executionService.findRangeWithCount(subqueryQuery),
			]);

			expect(arrayResult.count).toBe(2);
			expect(subqueryResult.count).toBe(2);
			expect(subqueryResult.results.map((r) => r.id)).toEqual(arrayResult.results.map((r) => r.id));
		});

		test('should filter by workflowId correctly', async () => {
			const workflow1 = await createWorkflow({}, member);
			const workflow2 = await createWorkflow({}, member);

			await Promise.all([
				createExecution({ status: 'success' }, workflow1),
				createExecution({ status: 'success' }, workflow2),
				createExecution({ status: 'success' }, workflow2),
			]);

			const arrayQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: workflow1.id,
				user: owner,
			};

			const subqueryQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				workflowId: workflow1.id,
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			};

			const [arrayResult, subqueryResult] = await Promise.all([
				executionService.findRangeWithCount(arrayQuery),
				executionService.findRangeWithCount(subqueryQuery),
			]);

			expect(arrayResult.count).toBe(1);
			expect(subqueryResult.count).toBe(1);
			expect(subqueryResult.results[0].workflowId).toBe(workflow1.id);
		});

		test('should work with team project', async () => {
			const teamProject = await createTeamProject();
			const personalWorkflow = await createWorkflow({}, owner);
			const teamWorkflow = await createWorkflow({}, teamProject);

			await Promise.all([
				createExecution({ status: 'success' }, personalWorkflow),
				createExecution({ status: 'success' }, teamWorkflow),
			]);

			const arrayQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const arrayResult = await executionService.findRangeWithCount(arrayQuery);
			expect(arrayResult.count).toBe(2);
		});

		test('should work with sharing-enabled roles (team project admin)', async () => {
			// Simulates the isSharingEnabled() === true path in the controller
			const teamProject = await createTeamProject(undefined, member);
			const personalWorkflow = await createWorkflow({}, member);
			const teamWorkflow = await createWorkflow({}, teamProject);
			const inaccessibleWorkflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, personalWorkflow),
				createExecution({ status: 'success' }, teamWorkflow),
				createExecution({ status: 'error' }, teamWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
			]);

			// Sharing-enabled roles: member can see workflows they own OR are admin/editor of
			const sharingEnabledQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner', 'workflow:editor'],
					projectRoles: ['project:personalOwner', 'project:admin', 'project:editor'],
				},
			};

			const result = await executionService.findRangeWithCount(sharingEnabledQuery);

			// member owns personalWorkflow and is admin of teamProject → sees 3 executions
			expect(result.count).toBe(3);
			const workflowIds = result.results.map((r) => r.workflowId);
			expect(workflowIds).toContain(personalWorkflow.id);
			expect(workflowIds).toContain(teamWorkflow.id);
			expect(workflowIds).not.toContain(inaccessibleWorkflow.id);
		});

		test('should work with sharing-enabled roles (team project editor)', async () => {
			// member is linked as project:editor to a team project they didn't create
			const teamProject = await createTeamProject();
			await linkUserToProject(member, teamProject, 'project:editor');
			const teamWorkflow = await createWorkflow({}, teamProject);
			const personalWorkflow = await createWorkflow({}, member);
			const inaccessibleWorkflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'success' }, teamWorkflow),
				createExecution({ status: 'success' }, personalWorkflow),
				createExecution({ status: 'success' }, inaccessibleWorkflow),
			]);

			const sharingEnabledQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner', 'workflow:editor'],
					projectRoles: ['project:personalOwner', 'project:admin', 'project:editor'],
				},
			};

			const result = await executionService.findRangeWithCount(sharingEnabledQuery);

			// member owns personalWorkflow and is editor in teamProject → sees 2 executions
			expect(result.count).toBe(2);
			const workflowIds = result.results.map((r) => r.workflowId);
			expect(workflowIds).toContain(teamWorkflow.id);
			expect(workflowIds).toContain(personalWorkflow.id);
			expect(workflowIds).not.toContain(inaccessibleWorkflow.id);
		});
	});

	describe('findLatestCurrentAndCompleted — subquery approach', () => {
		test('should return same results as array approach', async () => {
			const workflow = await createWorkflow({}, member);

			await Promise.all([
				createExecution({ status: 'running', stoppedAt: undefined }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'error' }, workflow),
			]);

			const arrayQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const subqueryQuery: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: member,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			};

			const [arrayResult, subqueryResult] = await Promise.all([
				executionService.findLatestCurrentAndCompleted(arrayQuery),
				executionService.findLatestCurrentAndCompleted(subqueryQuery),
			]);

			expect(arrayResult.count).toBe(subqueryResult.count);
			expect(arrayResult.results).toHaveLength(subqueryResult.results.length);

			const arrayIds = arrayResult.results.map((r) => r.id).sort();
			const subqueryIds = subqueryResult.results.map((r) => r.id).sort();
			expect(subqueryIds).toEqual(arrayIds);
		});
	});

	describe('getConcurrentExecutionsCount', () => {
		test('should return concurrentExecutionsCount when concurrency is enabled', async () => {
			globalConfig.executions.concurrency.productionLimit = 4;

			const workflow = await createWorkflow({}, owner);
			const concurrentExecutionsData = await Promise.all([
				createExecution({ status: 'running', mode: 'webhook' }, workflow),
				createExecution({ status: 'running', mode: 'trigger' }, workflow),
			]);

			await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'crashed' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'running', mode: 'manual' }, workflow),
			]);

			const output = await executionService.getConcurrentExecutionsCount();
			expect(output).toEqual(concurrentExecutionsData.length);
		});

		test('should set concurrentExecutionsCount to -1 when concurrency is disabled', async () => {
			globalConfig.executions.concurrency.productionLimit = -1;

			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'running', mode: 'webhook' }, workflow),
				createExecution({ status: 'running', mode: 'trigger' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'crashed' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'running', mode: 'manual' }, workflow),
			]);

			const output = await executionService.getConcurrentExecutionsCount();

			expect(output).toEqual(-1);
		});

		test('should set concurrentExecutionsCount to -1 in queue mode', async () => {
			globalConfig.executions.mode = 'queue';
			globalConfig.executions.concurrency.productionLimit = 4;

			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'running', mode: 'webhook' }, workflow),
				createExecution({ status: 'running', mode: 'trigger' }, workflow),
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'crashed' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'running', mode: 'manual' }, workflow),
			]);

			const output = await executionService.getConcurrentExecutionsCount();

			expect(output).toEqual(-1);
		});
	});

	describe('findLatestCurrentAndCompleted', () => {
		test('should return latest current and completed executions', async () => {
			const workflow = await createWorkflow({}, owner);

			const totalCompleted = 21;

			await Promise.all([
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				...new Array(totalCompleted)
					.fill(null)
					.map(async () => await createExecution({ status: 'success' }, workflow)),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(23); // 3 current + 20 completed (excludes 21st)
			expect(output.count).toBe(totalCompleted); // 21 finished, excludes current
			expect(output.estimated).toBe(false);
		});

		test('should handle zero current executions', async () => {
			const workflow = await createWorkflow({}, owner);

			const totalFinished = 5;

			await Promise.all(
				new Array(totalFinished)
					.fill(null)
					.map(async () => await createExecution({ status: 'success' }, workflow)),
			);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(totalFinished); // 5 finished
			expect(output.count).toBe(totalFinished); // 5 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero completed executions', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(3); // 3 finished
			expect(output.count).toBe(0); // 0 finished, excludes active
			expect(output.estimated).toBe(false);
		});

		test('should handle zero executions', async () => {
			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findLatestCurrentAndCompleted(query);

			expect(output.results).toHaveLength(0);
			expect(output.count).toBe(0);
			expect(output.estimated).toBe(false);
		});

		test('should prioritize `running` over `new` executions', async () => {
			const workflow = await createWorkflow({}, owner);

			await Promise.all([
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'running' }, workflow),
				createExecution({ status: 'new' }, workflow),
				createExecution({ status: 'new' }, workflow),
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				range: { limit: 2 },
				user: owner,
			};

			const { results } = await executionService.findLatestCurrentAndCompleted(query);

			expect(results).toHaveLength(2);
			expect(results[0].status).toBe('running');
			expect(results[1].status).toBe('running');
		});
	});

	describe('annotation', () => {
		const summaryShape = {
			id: expect.any(String),
			workflowId: expect.any(String),
			mode: expect.any(String),
			retryOf: null,
			status: expect.any(String),
			createdAt: expect.any(String),
			startedAt: expect.any(String),
			stoppedAt: expect.any(String),
			waitTill: null,
			retrySuccessId: null,
			workflowName: expect.any(String),
		};

		afterEach(async () => {
			await testDb.truncate(['AnnotationTagEntity', 'ExecutionAnnotation']);
		});

		test('should add and retrieve annotation', async () => {
			const workflow = await createWorkflow({}, owner);

			const execution1 = await createExecution({ status: 'success' }, workflow);
			const execution2 = await createExecution({ status: 'success' }, workflow);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				execution1.id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(execution2.id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(2);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual(
				expect.arrayContaining([
					{
						...summaryShape,
						annotation: {
							tags: [expect.objectContaining({ name: 'tag3' })],
							vote: 'down',
						},
					},
					{
						...summaryShape,
						annotation: {
							tags: expect.arrayContaining([
								expect.objectContaining({ name: 'tag1' }),
								expect.objectContaining({ name: 'tag2' }),
							]),
							vote: 'up',
						},
					},
				]),
			);
		});

		test('should update annotation', async () => {
			const workflow = await createWorkflow({}, owner);

			const execution = await createExecution({ status: 'success' }, workflow);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(execution.id, { vote: 'up', tags: [annotationTags[0].id] }, [
				workflow.id,
			]);

			await annotateExecution(execution.id, { vote: 'down', tags: [annotationTags[1].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: [expect.objectContaining({ name: 'tag2' })],
						vote: 'down',
					},
				},
			]);
		});

		test('should filter by annotation tags', async () => {
			const workflow = await createWorkflow({}, owner);

			const executions = await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(executions[1].id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
				annotationTags: [annotationTags[0].id],
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: expect.arrayContaining([
							expect.objectContaining({ name: 'tag1' }),
							expect.objectContaining({ name: 'tag2' }),
						]),
						vote: 'up',
					},
				},
			]);
		});

		test('should filter by annotation vote', async () => {
			const workflow = await createWorkflow({}, owner);

			const executions = await Promise.all([
				createExecution({ status: 'success' }, workflow),
				createExecution({ status: 'success' }, workflow),
			]);

			const annotationTags = await createAnnotationTags(['tag1', 'tag2', 'tag3']);

			await annotateExecution(
				executions[0].id,
				{ vote: 'up', tags: [annotationTags[0].id, annotationTags[1].id] },
				[workflow.id],
			);
			await annotateExecution(executions[1].id, { vote: 'down', tags: [annotationTags[2].id] }, [
				workflow.id,
			]);

			const query: ExecutionSummaries.RangeQuery = {
				kind: 'range',
				status: ['success'],
				range: { limit: 20 },
				user: owner,
				vote: 'up',
			};

			const output = await executionService.findRangeWithCount(query);

			expect(output.count).toBe(1);
			expect(output.estimated).toBe(false);
			expect(output.results).toEqual([
				{
					...summaryShape,
					annotation: {
						tags: expect.arrayContaining([
							expect.objectContaining({ name: 'tag1' }),
							expect.objectContaining({ name: 'tag2' }),
						]),
						vote: 'up',
					},
				},
			]);
		});
	});
});
