import { compileWorkflowJS } from './compiler';
import { COMPILER_EXAMPLES } from './examples';

describe('compileWorkflowJS', () => {
	describe('parse errors', () => {
		it('should return errors for invalid JS', () => {
			const result = compileWorkflowJS('const x = {{{');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].line).toBeDefined();
			expect(result.workflow.nodes).toEqual([]);
		});

		it('should return empty nodes on parse error', () => {
			const result = compileWorkflowJS('function (');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.workflow.nodes).toHaveLength(0);
		});
	});

	describe('metadata', () => {
		it('should parse @workflow name', () => {
			const result = compileWorkflowJS(`
// @workflow "My Test Workflow"
trigger.manual()
const x = await http.get('https://example.com');
`);
			expect(result.workflow.name).toBe('My Test Workflow');
		});

		it('should parse @trigger comment as fallback', () => {
			const result = compileWorkflowJS(`
// @trigger schedule
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.scheduleTrigger');
		});

		it('should default to manual trigger and "Compiled Workflow"', () => {
			const result = compileWorkflowJS(`
const x = await http.get('https://example.com');
`);
			expect(result.workflow.name).toBe('Compiled Workflow');
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.manualTrigger');
		});
	});

	describe('trigger statements', () => {
		it('should handle trigger.manual()', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.manualTrigger');
			expect(result.errors).toHaveLength(0);
		});

		it('should handle trigger.schedule with every option', () => {
			const result = compileWorkflowJS(`
trigger.schedule({ every: '5m' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.scheduleTrigger');
			expect(trigger?.parameters.rule).toEqual({
				interval: [{ field: 'minutes', minutesInterval: 5 }],
			});
		});

		it('should handle trigger.webhook with method and path', () => {
			const result = compileWorkflowJS(`
trigger.webhook({ method: 'POST', path: '/orders' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.webhook');
			expect(trigger?.parameters.httpMethod).toBe('POST');
			expect(trigger?.parameters.path).toBe('/orders');
		});

		it('should override @trigger comment with trigger statement', () => {
			const result = compileWorkflowJS(`
// @trigger schedule
trigger.webhook({ method: 'GET', path: '/status' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.webhook');
		});
	});

	describe('schedule mapping', () => {
		const scheduleTests = [
			{ input: '30s', expected: { field: 'seconds', secondsInterval: 30 } },
			{ input: '5m', expected: { field: 'minutes', minutesInterval: 5 } },
			{ input: '2h', expected: { field: 'hours', hoursInterval: 2 } },
			{ input: '1d', expected: { field: 'days', daysInterval: 1 } },
			{ input: '1w', expected: { field: 'weeks', weeksInterval: 1 } },
		];

		it.each(scheduleTests)('should map every "$input" correctly', ({ input, expected }) => {
			const result = compileWorkflowJS(`
trigger.schedule({ every: '${input}' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.parameters.rule).toEqual({ interval: [expected] });
		});

		it('should handle cron expressions', () => {
			const result = compileWorkflowJS(`
trigger.schedule({ cron: '0 9 * * *' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.parameters.rule).toEqual({
				interval: [{ field: 'cronExpression', expression: '0 9 * * *' }],
			});
		});
	});

	describe('webhook mapping', () => {
		it('should map method, path, and response', () => {
			const result = compileWorkflowJS(`
trigger.webhook({ method: 'GET', path: '/status', response: 'lastNode' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.parameters.httpMethod).toBe('GET');
			expect(trigger?.parameters.path).toBe('/status');
			expect(trigger?.parameters.responseMode).toBe('lastNode');
		});
	});

	describe('HTTP boundaries', () => {
		it('should create HTTP Request nodes for http.get', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com/users');
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			expect(httpNode?.parameters.method).toBe('GET');
			expect(httpNode?.parameters.url).toBe('https://api.example.com/users');
		});

		it('should create HTTP Request nodes for http.post with body', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com/data', { key: 'value' });
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.method).toBe('POST');
			expect(httpNode?.parameters.sendBody).toBe(true);
			expect(httpNode?.parameters.jsonBody).toBe('{"key":"value"}');
		});

		it('should handle http.put, http.patch, http.delete', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.put('https://api.example.com/a', { x: 1 });
await http.patch('https://api.example.com/b', { y: 2 });
await http.delete('https://api.example.com/c');
`);
			const httpNodes = result.workflow.nodes.filter(
				(n) => n.type === 'n8n-nodes-base.httpRequest',
			);
			expect(httpNodes).toHaveLength(3);
			expect(httpNodes[0].parameters.method).toBe('PUT');
			expect(httpNodes[1].parameters.method).toBe('PATCH');
			expect(httpNodes[2].parameters.method).toBe('DELETE');
		});

		it('should handle headers option', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com', { headers: { 'Authorization': 'Bearer token' } });
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.sendHeaders).toBe(true);
		});

		it('should handle query option', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com', { query: { page: '1' } });
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.sendQuery).toBe(true);
		});
	});

	describe('AI boundaries', () => {
		it('should create AI agent + model nodes for ai.chat', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('gpt-4o', 'Summarize this');
`);
			const agentNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.agent',
			);
			const modelNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(agentNode).toBeDefined();
			expect(modelNode).toBeDefined();
			expect(agentNode?.parameters.text).toBe('Summarize this');
		});

		it('should map claude model to Anthropic node', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('claude-sonnet-4-5-20250929', 'Analyze this');
`);
			const modelNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			);
			expect(modelNode).toBeDefined();
		});

		it('should map gemini model to Google node', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('gemini-pro', 'Process this');
`);
			const modelNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			);
			expect(modelNode).toBeDefined();
		});

		it('should connect model node to agent via ai_languageModel', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('gpt-4o', 'Test');
`);
			const modelNode = result.workflow.nodes.find((n) => n.type.includes('lmChat'));
			expect(modelNode).toBeDefined();
			const modelConnections = result.workflow.connections[modelNode!.name];
			expect(modelConnections?.ai_languageModel).toBeDefined();
		});
	});

	describe('code splitting', () => {
		it('should create separate Code nodes for sections separated by blank line + comment', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com');

// Filter active users
const active = data.filter(u => u.active);

// Build summary
const summary = { count: active.length };
`);
			const codeNodes = result.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNodes.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('variable tracking', () => {
		it('should track assigned variables across IO boundaries', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const users = await http.get('https://api.example.com/users');

// Process users
const names = users.map(u => u.name);
`);
			const codeNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNode).toBeDefined();
			// The code node should destructure 'users' from items[0].json
			expect(codeNode?.parameters.jsCode).toContain('users');
		});
	});

	describe('body handling', () => {
		it('should handle variable reference body', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com', data);
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.jsonBody).toBe('={{ $json.data }}');
		});

		it('should handle expression body with $json references', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const x = await http.get('https://api.example.com');
await http.post('https://api.example.com', { result: x });
`);
			const httpNodes = result.workflow.nodes.filter(
				(n) => n.type === 'n8n-nodes-base.httpRequest',
			);
			const postNode = httpNodes.find((n) => n.parameters.method === 'POST');
			expect(postNode?.parameters.sendBody).toBe(true);
		});
	});

	describe('node generation', () => {
		it('should generate nodes with correct types and typeVersions', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(trigger?.typeVersion).toBe(1);
			expect(httpNode?.typeVersion).toBe(4.2);
		});

		it('should position nodes with increasing X', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const a = await http.get('https://a.com');
const b = await http.get('https://b.com');
`);
			const nonStickyNodes = result.workflow.nodes.filter(
				(n) => n.type !== 'n8n-nodes-base.stickyNote',
			);
			for (let i = 1; i < nonStickyNodes.length; i++) {
				expect(nonStickyNodes[i].position[0]).toBeGreaterThan(nonStickyNodes[i - 1].position[0]);
			}
		});

		it('should create connections between sequential nodes', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com');
`);
			const startConnections = result.workflow.connections['Start'];
			expect(startConnections?.main?.[0]).toBeDefined();
			expect(startConnections.main[0].length).toBeGreaterThan(0);
		});
	});

	describe('sticky notes', () => {
		it('should create sticky notes from comments', () => {
			const result = compileWorkflowJS(`
trigger.manual()

// Fetch user data
const data = await http.get('https://api.example.com');
`);
			const stickyNotes = result.workflow.nodes.filter(
				(n) => n.type === 'n8n-nodes-base.stickyNote',
			);
			expect(stickyNotes.length).toBeGreaterThan(0);
			expect(stickyNotes[0].parameters.content).toContain('Fetch user data');
		});
	});

	describe('await trigger calls', () => {
		it('should handle await trigger.schedule()', () => {
			const result = compileWorkflowJS(`
await trigger.schedule({ every: '2h' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.type).toBe('n8n-nodes-base.scheduleTrigger');
			expect(trigger?.parameters.rule).toEqual({
				interval: [{ field: 'hours', hoursInterval: 2 }],
			});
		});
	});

	describe('schedule fallback', () => {
		it('should default to daily for unrecognized interval format', () => {
			const result = compileWorkflowJS(`
trigger.schedule({ every: '3x' })
const x = await http.get('https://example.com');
`);
			const trigger = result.workflow.nodes.find((n) => n.name === 'Start');
			expect(trigger?.parameters.rule).toEqual({
				interval: [{ field: 'days', daysInterval: 1 }],
			});
		});
	});

	describe('code-only programs', () => {
		it('should handle programs with no IO calls, splitting at comments', () => {
			const result = compileWorkflowJS(`
trigger.manual()

// Step 1
const a = 1;
const b = 2;

// Step 2
const c = a + b;
`);
			expect(result.errors).toHaveLength(0);
			const codeNodes = result.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNodes.length).toBeGreaterThanOrEqual(1);
		});

		it('should return empty segments for code-only with only metadata comments', () => {
			const result = compileWorkflowJS(`
// @workflow "Empty"
trigger.manual()
`);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('template literal extraction', () => {
		it('should extract template literal URLs with variable interpolation', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const id = 123;
const data = await http.get(\`https://api.example.com/users/\${id}\`);
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			// Template literal produces an expression with $json reference for the interpolated var
			expect(httpNode?.parameters.url).toContain('$json.id');
		});
	});

	describe('HTTP auth option', () => {
		it('should set authentication when auth option is provided', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com', { auth: 'myCredential' });
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.authentication).toBe('predefinedCredentialType');
			expect(httpNode?.credentials).toEqual({
				httpCustomAuth: { id: '', name: 'myCredential' },
			});
		});
	});

	describe('HTTP options as third argument', () => {
		it('should handle options as third arg after body', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com', { data: 1 }, { headers: { 'X-Key': 'abc' } });
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.parameters.sendBody).toBe(true);
			expect(httpNode?.parameters.sendHeaders).toBe(true);
		});
	});

	describe('AI options as third argument', () => {
		it('should handle AI chat with options', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('gpt-4o', 'Summarize', { temperature: 0.5 });
`);
			expect(result.errors).toHaveLength(0);
			const agentNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.agent',
			);
			expect(agentNode).toBeDefined();
		});
	});

	describe('default model mapping', () => {
		it('should default to OpenAI for unrecognized model names', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const answer = await ai.chat('some-unknown-model', 'Test');
`);
			const modelNode = result.workflow.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNode).toBeDefined();
		});
	});

	describe('HTTP node naming', () => {
		it('should generate name from invalid URL', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get(endpoint);
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});

		it('should truncate long HTTP node names', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://very-long-domain-name.example.com/very/long/path/to/resource/endpoint');
`);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode!.name.length).toBeLessThanOrEqual(40);
		});
	});

	describe('code node naming', () => {
		it('should truncate long first line for code node names', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://example.com');

const thisIsAVeryLongVariableNameThatExceedsFortyCharacters = data.map(item => item.value).filter(v => v > 0);
`);
			const codeNodes = result.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNodes.length).toBeGreaterThanOrEqual(1);
			for (const node of codeNodes) {
				expect(node.name.length).toBeLessThanOrEqual(40);
			}
		});
	});

	describe('destructuring variable detection', () => {
		it('should track destructured variables across IO boundaries', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const { name, age } = await http.get('https://api.example.com/user');

// Use destructured vars
const greeting = \`Hello \${name}, age \${age}\`;
`);
			expect(result.errors).toHaveLength(0);
			const codeNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNode).toBeDefined();
			const jsCode = codeNode?.parameters.jsCode ?? '';
			expect(jsCode).toContain('name');
		});

		it('should detect destructured variables declared in code segments', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const data = await http.get('https://api.example.com/user');

// Process data
const { firstName, lastName: last } = data;
const fullName = firstName + ' ' + last;

await http.post('https://api.example.com/greeting', { name: fullName });
`);
			expect(result.errors).toHaveLength(0);
			const codeNodes = result.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
			expect(codeNodes.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('expression edge cases', () => {
		it('should handle call expression in body (e.g. JSON.stringify)', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const items = [1, 2, 3];
await http.post('https://api.example.com', JSON.stringify(items));
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			expect(httpNode?.parameters.method).toBe('POST');
		});

		it('should handle binary expression in string extraction', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const base = 'https://api.example.com';
const url = base + '/users';
await http.get(url);
`);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle array expression as body (unrecognized node type)', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com', [1, 2, 3]);
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});

		it('should handle direct function call as body (non-method call)', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com', encode(data));
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});

		it('should handle conditional expression as URL (unrecognized node in extractStringValue)', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const isProd = true;
await http.get(isProd ? 'https://prod.example.com' : 'https://staging.example.com');
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});

		it('should handle standalone function call expression for body reference', () => {
			const result = compileWorkflowJS(`
trigger.manual()
await http.post('https://api.example.com', transform(input));
`);
			expect(result.errors).toHaveLength(0);
			const httpNode = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});
	});

	describe('statement grouping', () => {
		it('should group consecutive statements and split at gaps', () => {
			const result = compileWorkflowJS(`
trigger.manual()
const a = await http.get('https://api.example.com/a');

const x = a.filter(i => i.active);
const y = x.map(i => i.name);


const z = y.join(', ');

const b = await http.get('https://api.example.com/b');
`);
			expect(result.errors).toHaveLength(0);
			expect(result.workflow.nodes.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe('comment grouping', () => {
		it('should group consecutive comments on adjacent lines into one sticky note', () => {
			const result = compileWorkflowJS(`
trigger.manual()

// Step 1: Fetch data
// This fetches from the API
const data = await http.get('https://api.example.com');
`);
			expect(result.errors).toHaveLength(0);
			const stickyNotes = result.workflow.nodes.filter(
				(n) => n.type === 'n8n-nodes-base.stickyNote',
			);
			// Adjacent comments should be grouped into one sticky note
			expect(stickyNotes).toHaveLength(1);
			expect(stickyNotes[0].parameters.content).toContain('Step 1');
			expect(stickyNotes[0].parameters.content).toContain('fetches from the API');
		});

		it('should split non-adjacent comments into separate sticky notes', () => {
			const result = compileWorkflowJS(`
trigger.manual()

// First section
const a = await http.get('https://api.example.com/a');

// Second section
const b = await http.get('https://api.example.com/b');
`);
			expect(result.errors).toHaveLength(0);
			const stickyNotes = result.workflow.nodes.filter(
				(n) => n.type === 'n8n-nodes-base.stickyNote',
			);
			expect(stickyNotes.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('full examples', () => {
		it.each(COMPILER_EXAMPLES.map((ex) => [ex.label, ex.code]))(
			'should compile "%s" without errors',
			(_label, code) => {
				const result = compileWorkflowJS(code);
				expect(result.errors).toHaveLength(0);
				expect(result.workflow.nodes.length).toBeGreaterThan(0);
			},
		);
	});
});
