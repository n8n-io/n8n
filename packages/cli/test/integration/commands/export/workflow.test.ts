import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	createTeamProject,
} from '@n8n/backend-test-utils';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

test('should reject --all with --projectId', async () => {
	const project = await createTeamProject();
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run(['--all', `--projectId=${project.id}`, `--output=${outputFile}`]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should reject --id with --projectId', async () => {
	const project = await createTeamProject();
	const workflow = await createWorkflowWithTriggerAndHistory();
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run([`--id=${workflow.id}`, `--projectId=${project.id}`, `--output=${outputFile}`]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should export workflows by project with --projectId', async () => {
	const projectA = await createTeamProject();
	const projectB = await createTeamProject();
	const workflowInProjectA = await createWorkflowWithTriggerAndHistory(
		{ name: 'Project A workflow' },
		projectA,
	);
	await createWorkflowWithTriggerAndHistory({ name: 'Project B workflow' }, projectB);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--projectId=${projectA.id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

	expect(exportedData).toHaveLength(1);
	expect(exportedData[0].id).toBe(workflowInProjectA.id);
	expect(exportedData[0].name).toBe('Project A workflow');
});
