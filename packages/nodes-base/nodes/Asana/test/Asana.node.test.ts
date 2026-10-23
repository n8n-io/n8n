import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';
import { rmSync } from 'node:fs';

const { userFolder, previousUserFolder } = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const previousUserFolder = process.env.N8N_USER_FOLDER;
	const userFolder = mkdtempSync(join(tmpdir(), 'n8n-asana-limit-'));
	process.env.N8N_USER_FOLDER = userFolder;
	return { userFolder, previousUserFolder };
});

describe('Asana Get Many Projects', () => {
	const testHarness = new NodeTestHarness();
	const project = { gid: 'project-1', name: 'Example project', resource_type: 'project' };
	const errorResponse = {
		errors: [
			{
				message: 'limit: Value must be <= 100. 101 is not',
				help: 'For more information on API status codes and how to handle them, read the docs on errors: https://developers.asana.com/docs/errors',
			},
		],
	};

	afterEach(() => {
		try {
			expect(nock.isDone()).toBe(true);
		} finally {
			nock.cleanAll();
		}
	});

	afterAll(() => {
		if (previousUserFolder === undefined) {
			delete process.env.N8N_USER_FOLDER;
		} else {
			process.env.N8N_USER_FOLDER = previousUserFolder;
		}
		rmSync(userFolder, { recursive: true, force: true });
	});

	for (const limit of [100, 101]) {
		const expectedJson =
			limit === 100
				? project
				: { error: expect.stringMatching(/limit.*(?:<=\s*100|100 or (?:lower|less))/i) };

		// NODE-5779: Show the maximum in the error that the node returns to the user.
		const testData: WorkflowTestData = {
			description:
				limit === 100
					? 'should return projects when the limit is 100'
					: 'should state the maximum limit of 100 in the error output when the limit is 101',
			input: {
				workflowData: {
					nodes: [
						{
							id: 'asana-node',
							name: 'Asana',
							type: 'n8n-nodes-base.asana',
							typeVersion: 1,
							position: [0, 0],
							continueOnFail: true,
							parameters: {
								authentication: 'accessToken',
								resource: 'project',
								operation: 'getAll',
								workspace: 'workspace-1',
								returnAll: false,
								limit,
								additionalFields: {},
							},
							credentials: { asanaApi: { id: 'asana-credentials', name: 'Asana API' } },
						},
					],
					connections: {},
				},
			},
			credentials: { asanaApi: { accessToken: 'test-access-token' } },
			output: {
				nodeData: {
					Asana: [[{ json: expectedJson }]],
				},
			},
			nock: {
				baseUrl: 'https://app.asana.com',
				mocks: [
					{
						method: 'get',
						path: `/api/1.0/projects?workspace=workspace-1&limit=${limit}`,
						statusCode: limit === 100 ? 200 : 400,
						responseBody: limit === 100 ? { data: [project] } : errorResponse,
					},
				],
			},
		};

		testHarness.setupTest(testData);
	}
});
