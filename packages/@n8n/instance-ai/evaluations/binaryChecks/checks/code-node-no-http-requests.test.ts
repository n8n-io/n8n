import { codeNodeNoHttpRequests } from './code-node-no-http-requests';
import type { WorkflowResponse } from '../../clients/n8n-client';

function workflowWithCodeNode(parameters: Record<string, unknown>): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Code HTTP test',
		active: false,
		nodes: [
			{
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				parameters: {},
			},
			{
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters,
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Code', type: 'main', index: 0 }]],
			},
		},
	};
}

describe('codeNodeNoHttpRequests', () => {
	it('fails when a Code node uses fetch()', async () => {
		const workflow = workflowWithCodeNode({
			mode: 'runOnceForAllItems',
			jsCode: "const res = await fetch('https://api.example.com/items');\nreturn await res.json();",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Fetch items' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('fetch()');
		expect(result.comment).toContain('HTTP Request node');
	});

	it('fails when a Code node uses axios', async () => {
		const workflow = workflowWithCodeNode({
			jsCode:
				"const axios = require('axios');\nconst res = await axios.get(url);\nreturn res.data;",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('axios');
	});

	it('fails when a Code node requires the http module', async () => {
		const workflow = workflowWithCodeNode({
			jsCode: "const https = require('https');\nreturn [];",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('require of an HTTP module');
	});

	it('fails when a Code node uses this.helpers.httpRequest', async () => {
		const workflow = workflowWithCodeNode({
			jsCode: 'const res = await this.helpers.httpRequest({ url });\nreturn [{ json: res }];',
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('this.helpers.httpRequest');
	});

	it('fails when a Python Code node uses requests', async () => {
		const workflow = workflowWithCodeNode({
			language: 'python',
			pythonCode:
				"import requests\nres = requests.get('https://api.example.com')\nreturn res.json()",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('requests');
	});

	it('fails when a Python Code node uses a from-import of an HTTP library', async () => {
		const workflow = workflowWithCodeNode({
			language: 'pythonNative',
			pythonCode:
				"from requests import get\nres = get('https://api.example.com')\nreturn res.json()",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('requests');
	});

	it('fails when a Python Code node imports urllib via from-import', async () => {
		const workflow = workflowWithCodeNode({
			language: 'python',
			pythonCode:
				"from urllib.request import urlopen\nres = urlopen('https://api.example.com')\nreturn res.read()",
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('urllib');
	});

	it('ignores code of the inactive language', async () => {
		const workflow = workflowWithCodeNode({
			language: 'python',
			jsCode: "const res = await fetch('https://api.example.com');\nreturn await res.json();",
			pythonCode: 'return [item.json for item in _input.all()]',
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Process data' });

		expect(result).toEqual({ pass: true });
	});

	it('passes when Code nodes only transform data', async () => {
		const workflow = workflowWithCodeNode({
			mode: 'runOnceForAllItems',
			jsCode:
				'const items = $input.all();\nreturn items.map((item) => ({ json: { ...item.json, processed: true } }));',
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Process data' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag comments mentioning fetched data', async () => {
		const workflow = workflowWithCodeNode({
			jsCode: '// transform the data fetched by the HTTP Request node\nreturn $input.all();',
		});

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Process data' });

		expect(result).toEqual({ pass: true });
	});

	it('reports N/A when the workflow has no Code nodes', async () => {
		const workflow: WorkflowResponse = {
			id: 'wf-2',
			name: 'No code',
			active: false,
			nodes: [
				{
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					parameters: {},
				},
				{
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { url: 'https://api.example.com' },
				},
			],
			connections: {},
		};

		const result = await codeNodeNoHttpRequests.run(workflow, { prompt: 'Call an API' });

		expect(result).toEqual({ pass: true, applicable: false });
	});
});
