import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { WorkflowPublishedVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';

let workflowPublishedVersionRepository: WorkflowPublishedVersionRepository;
let workflowPublishedDataService: WorkflowPublishedDataService;

beforeAll(async () => {
	await testDb.init();
	workflowPublishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	workflowPublishedDataService = Container.get(WorkflowPublishedDataService);
});

afterAll(async () => {
	await testDb.terminate();
});

const makeNode = (name: string): INode => ({
	id: uuid(),
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

describe('WorkflowPublishedDataService', () => {
	test('should read nodes/connections from workflow_published_version table', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		// Write to published version table
		await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		const result = await workflowPublishedDataService.getPublishedWorkflowData(workflow.id);

		expect(result).not.toBeNull();
		expect(result!.id).toBe(workflow.id);
		expect(result!.nodes).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'n8n-nodes-base.scheduleTrigger' })]),
		);
	});

	test('should return data from a different version than activeVersion when published_version table points elsewhere', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		// Create a second history version with different nodes
		const alternateVersionId = uuid();
		const alternateNodes = [makeNode('Alternate Node')];
		await createWorkflowHistoryItem(workflow.id, {
			versionId: alternateVersionId,
			nodes: alternateNodes,
			connections: {},
		});

		// Point the published version table to the alternate version
		// (NOT the activeVersion). This proves we're reading from the table.
		await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, alternateVersionId);

		const result = await workflowPublishedDataService.getPublishedWorkflowData(workflow.id);

		expect(result).not.toBeNull();
		// Should have the alternate nodes, NOT the original activeVersion nodes
		expect(result!.nodes).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Alternate Node' })]),
		);
		expect(result!.nodes).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'n8n-nodes-base.scheduleTrigger' })]),
		);
	});

	test('should fall back to activeVersion when published_version table has no record', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		// Don't write to published version table

		const result = await workflowPublishedDataService.getPublishedWorkflowData(workflow.id);

		// Should fall back to the activeVersion
		expect(result).not.toBeNull();
		expect(result!.nodes).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'n8n-nodes-base.scheduleTrigger' })]),
		);
	});

	test('should pick up changes when published_version is updated without reactivation', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		// Initially point to the original version
		await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		const firstResult = await workflowPublishedDataService.getPublishedWorkflowData(workflow.id);
		expect(firstResult!.nodes).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'n8n-nodes-base.scheduleTrigger' })]),
		);

		// Create a new version and update the published version table directly
		// (simulating what the outbox consumer will do in the future)
		const newVersionId = uuid();
		const newNodes = [makeNode('Updated Node')];
		await createWorkflowHistoryItem(workflow.id, {
			versionId: newVersionId,
			nodes: newNodes,
			connections: {},
		});
		await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, newVersionId);

		// Without any reactivation, a fresh read should return the new nodes
		const secondResult = await workflowPublishedDataService.getPublishedWorkflowData(workflow.id);
		expect(secondResult!.nodes).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Updated Node' })]),
		);
	});
});
