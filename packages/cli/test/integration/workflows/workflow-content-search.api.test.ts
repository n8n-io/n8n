import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { INode, INodeParameters } from 'n8n-workflow';

import { createTag } from '../shared/db/tags';
import { createMember, createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });

const NEEDLE = 'alphatoken';

const node = (name: string, parameters: INodeParameters = {}): INode => ({
	id: name,
	name,
	parameters,
	position: [0, 0],
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
});

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

beforeEach(async () => {
	await testDb.truncate([
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
		'TagEntity',
		'Project',
		'User',
	]);
	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);
});

describe('GET /workflows/search', () => {
	test('ranks matches by where the phrase was found', async () => {
		const byName = await createWorkflow({ name: `Customer ${NEEDLE} sync` }, owner);
		const byNodeName = await createWorkflow({ nodes: [node(`${NEEDLE} trigger`)] }, owner);
		const byNodeParams = await createWorkflow(
			{ nodes: [node('HTTP', { url: `https://${NEEDLE}.example.com` })] },
			owner,
		);
		const byDescription = await createWorkflow({ description: `handles ${NEEDLE} events` }, owner);
		const byHistory = await createWorkflow({}, owner);
		const historyVersion = await createWorkflowHistoryItem(byHistory.id, {
			name: `${NEEDLE} revamp`,
		});
		const byTag = await createWorkflow({}, owner);
		await createTag({ name: `${NEEDLE}-team` }, byTag);
		// Phrase only appears in the nodes of a past version
		const byHistoryContent = await createWorkflow({}, owner);
		const historyContentVersion = await createWorkflowHistoryItem(byHistoryContent.id, {
			nodes: [node(`${NEEDLE} removed node`)],
		});
		// A past version of a workflow already matched by name must not duplicate it
		await createWorkflowHistoryItem(byName.id, { nodes: [node(`${NEEDLE} old node`)] });
		const archived = await createWorkflow({ name: `${NEEDLE} archived`, isArchived: true }, owner);
		await createWorkflow({ name: 'unrelated' }, owner);

		const response = await authOwnerAgent
			.get('/workflows/search')
			.query({ query: NEEDLE })
			.expect(200);

		const { results, count } = response.body.data;
		expect(count).toBe(7);
		expect(results.map((r: { id: string }) => r.id)).toEqual([
			byName.id,
			byNodeName.id,
			byNodeParams.id,
			byDescription.id,
			byHistory.id,
			byTag.id,
			byHistoryContent.id,
		]);
		expect(results.map((r: { matchedIn: string }) => r.matchedIn)).toEqual([
			'name',
			'nodeName',
			'nodeParameters',
			'description',
			'history',
			'other',
			'historyContent',
		]);
		expect(results[1].matchDetail).toBe(`${NEEDLE} trigger`);
		expect(results[1].matchedNodeId).toBe(`${NEEDLE} trigger`); // node helper uses name as id
		expect(results[2].matchDetail).toBe('HTTP');
		expect(results[2].matchedNodeId).toBe('HTTP');
		expect(results[4].matchDetail).toBe(`${NEEDLE} revamp`);
		expect(results[4].matchedVersionId).toBe(historyVersion.versionId);
		expect(results[5].matchDetail).toBe(`${NEEDLE}-team`);
		expect(results[6].matchedVersionId).toBe(historyContentVersion.versionId);
		expect(results.map((r: { id: string }) => r.id)).not.toContain(archived.id);
	});

	test('matches case-insensitively', async () => {
		const workflow = await createWorkflow({ name: `Customer ${NEEDLE} sync` }, owner);

		const response = await authOwnerAgent
			.get('/workflows/search')
			.query({ query: NEEDLE.toUpperCase() })
			.expect(200);

		expect(response.body.data.results.map((r: { id: string }) => r.id)).toEqual([workflow.id]);
	});

	test('only returns workflows the user can read', async () => {
		await createWorkflow({ name: `${NEEDLE} owner-only` }, owner);
		const memberWorkflow = await createWorkflow({ name: `${NEEDLE} member` }, member);

		const response = await authMemberAgent
			.get('/workflows/search')
			.query({ query: NEEDLE })
			.expect(200);

		expect(response.body.data.results.map((r: { id: string }) => r.id)).toEqual([
			memberWorkflow.id,
		]);
	});

	test('rejects a missing query', async () => {
		await authOwnerAgent.get('/workflows/search').expect(400);
	});

	test('rejects a query shorter than 3 characters', async () => {
		await authOwnerAgent.get('/workflows/search').query({ query: 'ab' }).expect(400);
	});
});
