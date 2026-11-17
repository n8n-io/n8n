import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/ai-agent.json';

const lookupNode = `
class Lookup {
	description = {
		displayName: 'Acme lookup',
		name: 'lookup',
		group: ['transform'],
		version: 1,
		description: 'Looks up a query',
		defaults: { name: 'Acme lookup' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [{ displayName: 'Query', name: 'query', type: 'string', default: '' }],
	};

	async execute() {
		return [this.getInputData().map((_, index) => ({ json: { found: this.getNodeParameter('query', index) } }))];
	}
}
module.exports = { Lookup };
`;

function createTestProject() {
	const project = mkdtempSync(path.join(tmpdir(), 'n8n-test-project-'));
	const communityPackage = path.join(project, 'node_modules', 'n8n-nodes-acme');
	mkdirSync(path.join(communityPackage, 'dist'), { recursive: true });
	writeFileSync(
		path.join(project, 'package.json'),
		JSON.stringify({ devDependencies: { 'n8n-nodes-acme': '1.0.0' } }),
	);
	writeFileSync(
		path.join(communityPackage, 'package.json'),
		JSON.stringify({
			name: 'n8n-nodes-acme',
			version: '1.0.0',
			n8n: { nodes: ['dist/Lookup.node.js'] },
		}),
	);
	writeFileSync(path.join(communityPackage, 'dist', 'Lookup.node.js'), lookupNode);
	return project;
}

const projectDirectory = process.cwd();

beforeAll(() => process.chdir(createTestProject()));

afterAll(() => process.chdir(projectDirectory));

test('runs a community node that the test project installs', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('AI Agent'), [{ output: 'A workflow tool.' }]);

	const result = await executeWorkflow(workflow, { input: { question: 'What is n8n?' } });

	expect(result.output).toEqual([{ found: 'A workflow tool.' }]);
});
