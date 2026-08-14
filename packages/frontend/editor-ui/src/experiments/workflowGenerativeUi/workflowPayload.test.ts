import { buildWorkflowUiPayload } from './workflowPayload';

describe('buildWorkflowUiPayload', () => {
	it('strips credentials and keeps parameters', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Lead flow',
			nodes: [
				{
					id: '1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					credentials: { slackApi: { id: 'x', name: 'secret' } },
					parameters: { resource: 'message', operation: 'post', text: 'hi', channelId: '#sales' },
				},
			],
			connections: {},
		});
		expect(payload.nodes[0]).not.toHaveProperty('credentials');
		expect(payload.nodes[0].resource).toBe('message');
		expect(payload.nodes[0].operation).toBe('post');
		expect(payload.nodes[0].parameters).toEqual(
			expect.objectContaining({ text: 'hi', channelId: '#sales' }),
		);
	});

	it('extracts the AI model, prompt, and tool names without touching credentials', () => {
		const payload = buildWorkflowUiPayload({
			name: 'AI flow',
			nodes: [
				{
					id: 'ai',
					name: 'Summarize incident',
					type: 'n8n-nodes-langchain.agent',
					typeVersion: 1,
					credentials: { openAiApi: { id: 'x', name: 'super-secret' } },
					parameters: {
						promptType: 'define',
						options: { systemMessage: 'You are a precise incident summarizer.' },
						model: { __rl: true, value: 'gpt-4o', mode: 'list' },
						tools: [{ name: 'calculator' }, { name: 'web-search' }],
					},
				},
			],
			connections: {},
		});

		const content = payload.nodes[0].content;
		expect(content?.model).toBe('gpt-4o');
		expect(content?.prompt).toBe('You are a precise incident summarizer.');
		expect(content?.tools).toEqual(['calculator', 'web-search']);
		expect(JSON.stringify(payload.nodes[0])).not.toContain('super-secret');
	});

	it('extracts the HTTP URL from an HTTP request node', () => {
		const payload = buildWorkflowUiPayload({
			name: 'HTTP flow',
			nodes: [
				{
					id: 'http',
					name: 'Check health',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						method: 'GET',
						url: 'https://status.acme.com/health',
						options: { timeout: 10000 },
					},
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.url).toBe('https://status.acme.com/health');
	});

	it('extracts a shell command from an SSH node', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Ops flow',
			nodes: [
				{
					id: 'ssh',
					name: 'Restart service',
					type: 'n8n-nodes-base.ssh',
					typeVersion: 1,
					parameters: {
						resource: 'command',
						operation: 'execute',
						command: 'sudo systemctl restart acme-web',
					},
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.command).toBe('sudo systemctl restart acme-web');
	});

	it('extracts the message body destined for a chat node', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Notify flow',
			nodes: [
				{
					id: 'slack',
					name: 'Notify incidents',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.3,
					parameters: {
						resource: 'message',
						operation: 'post',
						channel: '#incidents',
						text: 'acme-web was restarted and the incident log was archived.',
					},
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.message).toBe(
			'acme-web was restarted and the incident log was archived.',
		);
	});

	it('extracts a file path from an FTP node', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Archive flow',
			nodes: [
				{
					id: 'ftp',
					name: 'Upload incident log',
					type: 'n8n-nodes-base.ftp',
					typeVersion: 1,
					parameters: {
						protocol: 'sftp',
						operation: 'upload',
						path: '/var/incidents/',
						binaryPropertyName: 'incidentLog',
					},
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.path).toBe('/var/incidents/');
	});

	it('extracts a database query', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Record flow',
			nodes: [
				{
					id: 'pg',
					name: 'Record incident',
					type: 'n8n-nodes-base.postgres',
					typeVersion: 2.6,
					parameters: {
						operation: 'executeQuery',
						query: "INSERT INTO incidents (service, status) VALUES ('acme-web', 'recovered')",
					},
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.query).toContain('INSERT INTO incidents');
	});

	it('renders IF conditions in readable English without evaluating expressions', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Branch flow',
			nodes: [
				{
					id: 'if',
					name: 'Service is unhealthy?',
					type: 'n8n-nodes-base.if',
					typeVersion: 2.2,
					parameters: {
						conditions: {
							options: { caseSensitive: true, leftValue: '' },
							conditions: [
								{
									leftValue: '={{ $json.status }}',
									rightValue: 'healthy',
									operator: { type: 'string', operation: 'notEquals' },
								},
							],
						},
					},
				},
			],
			connections: {},
		});

		const conditions = payload.nodes[0].content?.conditions;
		expect(conditions).toHaveLength(1);
		expect(conditions?.[0]).toContain('$json.status');
		expect(conditions?.[0]).toContain('is not');
		expect(conditions?.[0]).toContain('healthy');
		expect(conditions?.[0]).not.toContain('={{');
	});

	it('truncates long extracted content', () => {
		const command = 'echo '.repeat(400);
		const payload = buildWorkflowUiPayload({
			name: 'Long flow',
			nodes: [
				{
					id: 'ssh',
					name: 'Run',
					type: 'n8n-nodes-base.ssh',
					typeVersion: 1,
					parameters: { resource: 'command', operation: 'execute', command },
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].content?.command?.length).toBeLessThanOrEqual(300);
	});

	it('surfaces the human action label and subtitle when present', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Labelled flow',
			nodes: [
				{
					id: 'slack',
					name: 'Notify',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.3,
					action: 'Send a message',
					subtitle: 'message: post',
					parameters: { resource: 'message', operation: 'post', text: 'hi' },
				},
			],
			connections: {},
		});

		expect(payload.nodes[0].action).toBe('Send a message');
		expect(payload.nodes[0].subtitle).toBe('message: post');
	});

	it('normalizes main branches by node id and output index', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Branch flow',
			nodes: [
				{ id: 'trigger-id', name: 'Trigger', type: 'trigger', typeVersion: 1, parameters: {} },
				{ id: 'if-id', name: 'IF', type: 'if', typeVersion: 1, parameters: {} },
				{ id: 'yes-id', name: 'Yes', type: 'set', typeVersion: 1, parameters: {} },
				{ id: 'no-id', name: 'No', type: 'set', typeVersion: 1, parameters: {} },
			],
			connections: {
				IF: {
					main: [
						[{ node: 'Yes', type: 'main', index: 0 }],
						[{ node: 'No', type: 'main', index: 1 }],
					],
				},
				Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
			},
		});

		expect(payload.connections).toEqual([
			{
				sourceNodeId: 'if-id',
				targetNodeId: 'yes-id',
				type: 'main',
				outputIndex: 0,
				inputIndex: 0,
			},
			{
				sourceNodeId: 'if-id',
				targetNodeId: 'no-id',
				type: 'main',
				outputIndex: 1,
				inputIndex: 1,
			},
			{
				sourceNodeId: 'trigger-id',
				targetNodeId: 'if-id',
				type: 'main',
				outputIndex: 0,
				inputIndex: 0,
			},
		]);
	});

	it('normalizes error and tool-like connection types', () => {
		const payload = buildWorkflowUiPayload({
			name: 'AI flow',
			nodes: [
				{ id: 'agent-id', name: 'Agent', type: 'agent', typeVersion: 1, parameters: {} },
				{ id: 'tool-id', name: 'Tool', type: 'tool', typeVersion: 1, parameters: {} },
				{ id: 'error-id', name: 'Error', type: 'error', typeVersion: 1, parameters: {} },
			],
			connections: {
				Agent: {
					error: [[{ node: 'Error', type: 'error', index: 0 }]],
				},
				Tool: {
					ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 2 }]],
				},
			},
		});

		expect(payload.connections).toEqual([
			{
				sourceNodeId: 'agent-id',
				targetNodeId: 'error-id',
				type: 'error',
				outputIndex: 0,
				inputIndex: 0,
			},
			{
				sourceNodeId: 'tool-id',
				targetNodeId: 'agent-id',
				type: 'ai_tool',
				outputIndex: 0,
				inputIndex: 2,
			},
		]);
	});

	it('ignores malformed connections and unknown node names', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Malformed flow',
			nodes: [
				{ id: 'source-id', name: 'Source', type: 'source', typeVersion: 1, parameters: {} },
				{ id: 'target-id', name: 'Target', type: 'target', typeVersion: 1, parameters: {} },
			],
			connections: {
				Source: {
					main: [
						[
							{ node: 'Target', type: 'main', index: 0 },
							{ node: 'Missing', type: 'main', index: 0 },
							{ node: 'Target', type: 'main', index: -1 },
							null,
						],
						'not-an-output',
					],
					broken: 'not-outputs',
				},
				Missing: {
					main: [[{ node: 'Target', type: 'main', index: 0 }]],
				},
			},
		});

		expect(payload.connections).toEqual([
			{
				sourceNodeId: 'source-id',
				targetNodeId: 'target-id',
				type: 'main',
				outputIndex: 0,
				inputIndex: 0,
			},
		]);
	});
});
