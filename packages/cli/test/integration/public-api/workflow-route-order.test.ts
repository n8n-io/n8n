import { EventService } from '@n8n/backend-services';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { Telemetry } from '@/telemetry';

import { createTestRun } from '../shared/db/evaluation';
import { createTag } from '../shared/db/tags';
import { createOwnerWithApiKey } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * `GET /workflows/:workflowId/:workflowVersionId` matches every two-segment GET path under
 * `/workflows`. Express answers with the first matching route, so the order of registration decides
 * which handler gets a request. These tests call the real app with seeded data and check the body
 * of each response, so a request that reaches the wrong handler fails the assertion.
 *
 * Once `GET /workflows/:workflowId/:workflowVersionId` is removed, these tests can be deleted.
 */
mockInstance(Telemetry);

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'TagEntity',
		'TestRun',
		'TestCaseExecution',
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** A workflow with three saved versions, two tags and two test runs. */
async function seedWorkflow(label: string, tagNames: string[]) {
	const workflow = await createWorkflow({}, owner);

	const versions = [];
	for (const [index, name] of [`${label} v1`, `${label} v2`, `${label} v3`].entries()) {
		const workflowVersion = await createWorkflowHistoryItem(workflow.id, {
			versionId: uuid(),
			name,
			description: `${name} description`,
			authors: 'Test Author',
			createdAt: new Date(Date.now() + index),
			updatedAt: new Date(Date.now() + index),
		});
		versions.push(workflowVersion);
	}

	const tags = [];
	for (const name of tagNames) {
		const tag = await createTag({ name }, workflow);
		tags.push(tag);
	}

	const testRuns = [
		await createTestRun(workflow.id, { status: 'completed' }),
		await createTestRun(workflow.id, { status: 'error' }),
	];

	return { workflow, versions, tags, testRuns };
}

/** Sends a GET request and checks that exactly one `public-api-invoked` event came from it. */
async function get(path: string) {
	const emit = vi.spyOn(Container.get(EventService), 'emit');

	const response = await authOwnerAgent.get(path);

	expect(emit.mock.calls.filter(([event]) => event === 'public-api-invoked')).toHaveLength(1);
	emit.mockRestore();

	return response;
}

describe('workflow routes next to the deprecated version alias', () => {
	let target: Awaited<ReturnType<typeof seedWorkflow>>;

	beforeEach(async () => {
		target = await seedWorkflow('Target', ['production', 'team-a']);
	});

	test('GET /workflows/:workflowId/history returns the version list of that workflow', async () => {
		const response = await get(`/workflows/${target.workflow.id}/history`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toStrictEqual({
			// Newest first version first.
			data: [...target.versions].reverse().map((version) => ({
				versionId: version.versionId,
				workflowId: target.workflow.id,
				authors: 'Test Author',
				name: version.name,
				description: version.description,
				createdAt: version.createdAt.toISOString(),
				updatedAt: version.updatedAt.toISOString(),
			})),
			nextCursor: null,
		});
	});

	test('GET /workflows/:workflowId/tags returns the tags of that workflow', async () => {
		const response = await get(`/workflows/${target.workflow.id}/tags`);

		expect(response.statusCode).toBe(200);
		const [production, teamA] = target.tags;
		// The tags share one creation time, so the order is not defined. Sort by name.
		expect(
			response.body.sort((a: { name: string }, b: { name: string }) =>
				a.name.localeCompare(b.name),
			),
		).toStrictEqual([
			{
				id: production.id,
				name: 'production',
				createdAt: production.createdAt.toISOString(),
				updatedAt: production.updatedAt.toISOString(),
			},
			{
				id: teamA.id,
				name: 'team-a',
				createdAt: teamA.createdAt.toISOString(),
				updatedAt: teamA.updatedAt.toISOString(),
			},
		]);
	});

	test('GET /workflows/:workflowId/test-runs returns the test runs of that workflow', async () => {
		const response = await get(`/workflows/${target.workflow.id}/test-runs`);

		expect(response.statusCode).toBe(200);
		const [completedRun, errorRun] = target.testRuns;
		// The runs share one creation time, so the order is not defined. Sort by status.
		response.body.data.sort((a: { status: string }, b: { status: string }) =>
			a.status.localeCompare(b.status),
		);
		expect(response.body).toStrictEqual({
			data: [
				{
					id: completedRun.id,
					status: 'completed',
					runAt: null,
					completedAt: null,
					metrics: {},
					errorCode: null,
					errorDetails: null,
					finalResult: 'success',
					testCaseCount: 0,
					createdAt: completedRun.createdAt.toISOString(),
					updatedAt: completedRun.updatedAt.toISOString(),
				},
				{
					id: errorRun.id,
					status: 'error',
					runAt: null,
					completedAt: null,
					metrics: {},
					errorCode: null,
					errorDetails: null,
					finalResult: null,
					testCaseCount: 0,
					createdAt: errorRun.createdAt.toISOString(),
					updatedAt: errorRun.updatedAt.toISOString(),
				},
			],
			nextCursor: null,
		});
	});

	test('GET /workflows/:workflowId/versions/:workflowVersionId returns the full version', async () => {
		const [version] = target.versions;

		const response = await get(`/workflows/${target.workflow.id}/versions/${version.versionId}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toStrictEqual({
			versionId: version.versionId,
			workflowId: target.workflow.id,
			nodes: version.nodes,
			connections: version.connections,
			nodeGroups: [],
			authors: 'Test Author',
			name: 'Target v1',
			description: 'Target v1 description',
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
		});
	});

	test('GET /workflows/:workflowId/:workflowVersionId returns the same version with a Deprecation header', async () => {
		const [, version] = target.versions;

		const alias = await get(`/workflows/${target.workflow.id}/${version.versionId}`);
		const canonical = await get(`/workflows/${target.workflow.id}/versions/${version.versionId}`);

		expect(alias.statusCode).toBe(200);
		expect(alias.headers.deprecation).toMatch(/^@\d+$/);
		expect(alias.body).toStrictEqual({
			versionId: version.versionId,
			workflowId: target.workflow.id,
			nodes: version.nodes,
			connections: version.connections,
			nodeGroups: [],
			authors: 'Test Author',
			name: 'Target v2',
			description: 'Target v2 description',
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
		});
		expect(alias.body).toStrictEqual(canonical.body);
	});
});
