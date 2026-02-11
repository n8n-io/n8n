import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	setActiveVersion,
	createWorkflowHistory,
} from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import fs from 'fs';
import { nanoid } from 'nanoid';
import os from 'os';
import path from 'path';
import { ExportWorkflowsCommand } from '@/commands/export/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);

const command = setupTestCommand(ExportWorkflowsCommand);

let testOutputDir: string;

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
	testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-export-test-'));
});

afterEach(() => {
	if (fs.existsSync(testOutputDir)) {
		fs.rmSync(testOutputDir, { recursive: true, force: true });
	}
});

test('should reject both --version and --published flags', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory();
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run([
		`--id=${workflow.id}`,
		`--version=${workflow.versionId}`,
		'--published',
		`--output=${outputFile}`,
	]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should reject --version with --all flag', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory();
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run(['--all', `--version=${workflow.versionId}`, `--output=${outputFile}`]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should export current draft version when no flags set', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Test Workflow',
		nodes: [
			{
				id: 'uuid-draft',
				parameters: {},
				name: 'Draft Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [240, 300],
			},
		],
	});

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData).toMatchObject({
		id: workflow.id,
		name: 'Test Workflow',
		versionId: workflow.versionId,
	});
	expect(exportedData.nodes[0].name).toBe('Draft Node');
});

test('should export specified version with --version flag', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Test Workflow',
		nodes: [
			{
				id: 'uuid-v1',
				parameters: {},
				name: 'Version 1 Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [240, 300],
			},
		],
	});

	const version1Id = workflow.versionId;

	const newVersionId = nanoid();
	workflow.versionId = newVersionId;
	workflow.nodes = [
		{
			id: 'uuid-v2',
			parameters: {},
			name: 'Version 2 Node',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [240, 300],
		},
	];
	await Container.get(WorkflowRepository).save(workflow);
	await createWorkflowHistory(workflow);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--version=${version1Id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData).toMatchObject({
		id: workflow.id,
		versionId: version1Id,
	});
	expect(exportedData.nodes[0].name).toBe('Version 1 Node');
});

test('should export published version with --published flag', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Test Workflow',
		nodes: [
			{
				id: 'uuid-published',
				parameters: {},
				name: 'Published Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [240, 300],
			},
		],
	});

	const publishedVersionId = workflow.versionId;

	await setActiveVersion(workflow.id, publishedVersionId);

	const draftVersionId = nanoid();
	workflow.versionId = draftVersionId;
	workflow.activeVersionId = publishedVersionId;
	workflow.nodes = [
		{
			id: 'uuid-draft',
			parameters: {},
			name: 'Draft Node',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [240, 300],
		},
	];
	await Container.get(WorkflowRepository).save(workflow);
	await createWorkflowHistory(workflow);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, '--published', `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData).toMatchObject({
		id: workflow.id,
		versionId: publishedVersionId,
	});
	expect(exportedData.nodes[0].name).toBe('Published Node');
});

test('should optimize when target version is current draft', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Test Workflow',
	});

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([
		`--id=${workflow.id}`,
		`--version=${workflow.versionId}`,
		`--output=${outputFile}`,
	]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData).toMatchObject({
		id: workflow.id,
		versionId: workflow.versionId,
	});
});

test('should merge historical nodes with current metadata', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Original Name',
		nodes: [
			{
				id: 'uuid-v1',
				parameters: {},
				name: 'Version 1 Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [240, 300],
			},
		],
	});

	const version1Id = workflow.versionId;

	const newVersionId = nanoid();
	workflow.versionId = newVersionId;
	workflow.name = 'Updated Name';
	workflow.nodes = [
		{
			id: 'uuid-v2',
			parameters: {},
			name: 'Version 2 Node',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [240, 300],
		},
	];
	await Container.get(WorkflowRepository).save(workflow);
	await createWorkflowHistory(workflow);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--version=${version1Id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData.nodes[0].name).toBe('Version 1 Node');
	expect(exportedData.versionId).toBe(version1Id);
	expect(exportedData.name).toBe('Updated Name');
});

test('should error when version not found', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory();
	const nonExistentVersionId = 'non-existent-version';

	await expect(
		command.run([`--id=${workflow.id}`, `--version=${nonExistentVersionId}`]),
	).rejects.toThrow(
		`Version "${nonExistentVersionId}" not found for workflow "${workflow.name}" (${workflow.id})`,
	);
});

test('should error when --published used on unpublished workflow', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Unpublished Workflow',
	});

	workflow.activeVersionId = null;
	await Container.get(WorkflowRepository).save(workflow);

	await expect(command.run([`--id=${workflow.id}`, '--published'])).rejects.toThrow(
		`No published version found for workflow "${workflow.name}" (${workflow.id})`,
	);
});

test('should error when workflow not found', async () => {
	const nonExistentId = 'non-existent-id';

	await expect(command.run([`--id=${nonExistentId}`])).rejects.toThrow(
		'No workflows found with specified filters',
	);
});

test('should work without any version flags (existing behavior)', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Test Workflow',
	});

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData).toMatchObject({
		id: workflow.id,
		name: 'Test Workflow',
		versionId: workflow.versionId,
	});
});

test('should work with --all flag (existing behavior)', async () => {
	await createWorkflowWithTriggerAndHistory({ name: 'Workflow 1' });
	await createWorkflowWithTriggerAndHistory({ name: 'Workflow 2' });

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run(['--all', `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

	expect(exportedData).toHaveLength(2);

	const workflowNames = exportedData.map((w: any) => w.name);
	expect(workflowNames).toContain('Workflow 1');
	expect(workflowNames).toContain('Workflow 2');
});

test('should work with --pretty flag (existing behavior)', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory();

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, '--pretty', `--output=${outputFile}`]);

	const fileContents = fs.readFileSync(outputFile, 'utf-8');
	expect(fileContents).toContain('\n');
	expect(fileContents).toMatch(/\s{2}/);
});

test('should export all published versions with --all --published', async () => {
	const workflow1 = await createWorkflowWithTriggerAndHistory({ name: 'Published Workflow' });
	const publishedVersionId = workflow1.versionId;
	await setActiveVersion(workflow1.id, publishedVersionId);

	const draftVersionId = nanoid();
	workflow1.versionId = draftVersionId;
	workflow1.activeVersionId = publishedVersionId;
	await Container.get(WorkflowRepository).save(workflow1);
	await createWorkflowHistory(workflow1);

	await createWorkflowWithTriggerAndHistory({ name: 'Unpublished Workflow' });

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run(['--all', '--published', `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

	expect(exportedData).toHaveLength(1);
	expect(exportedData[0].name).toBe('Published Workflow');
	expect(exportedData[0].versionId).toBe(publishedVersionId);
});

test('should include versionMetadata with historical name when set', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		name: 'Original Name',
	});

	const version2Id = nanoid();
	workflow.versionId = version2Id;
	workflow.name = 'Updated Name';
	await Container.get(WorkflowRepository).save(workflow);

	await createWorkflowHistory(workflow, undefined, undefined, {
		name: 'Version 2 Historical Name',
	});

	const version3Id = nanoid();
	workflow.versionId = version3Id;
	workflow.name = 'Current Name';
	await Container.get(WorkflowRepository).save(workflow);
	await createWorkflowHistory(workflow);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--version=${version2Id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData.name).toBe('Current Name');
	expect(exportedData.versionId).toBe(version2Id);
	expect(exportedData.versionMetadata).toEqual({
		name: 'Version 2 Historical Name',
		description: null,
	});
});

test('should include versionMetadata with historical description when set', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({
		description: 'Original Description',
	});

	const version2Id = nanoid();
	workflow.versionId = version2Id;
	workflow.description = 'Updated Description';
	await Container.get(WorkflowRepository).save(workflow);

	await createWorkflowHistory(workflow, undefined, undefined, {
		description: 'Version 2 Historical Description',
	});

	const version3Id = nanoid();
	workflow.versionId = version3Id;
	workflow.description = 'Current Description';
	await Container.get(WorkflowRepository).save(workflow);
	await createWorkflowHistory(workflow);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--id=${workflow.id}`, `--version=${version2Id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))[0];

	expect(exportedData.description).toBe('Current Description');
	expect(exportedData.versionId).toBe(version2Id);
	expect(exportedData.versionMetadata).toEqual({
		name: null,
		description: 'Version 2 Historical Description',
	});
});
