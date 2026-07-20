import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { AwsAiAgent } from '../AwsAiAgent.node';

describe('AWS AI Agent node — description', () => {
	const node = new AwsAiAgent();

	it('has the expected identity', () => {
		expect(node.description.displayName).toBe('AWS AI Agent');
		expect(node.description.name).toBe('awsAiAgent');
		expect(node.description.icon).toBe('file:bedrock.svg');
		expect(node.description.version).toBe(1);
	});

	it('is an action node with one main input and output', () => {
		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
		expect(node.description.properties.some((p) => p.name === 'input')).toBe(true);
	});
});

describe('AWS AI Agent node — parameters', () => {
	const node = new AwsAiAgent();
	const prop = (name: string) => node.description.properties.find((p) => p.name === name);

	it('has a harness resource-locator wired to searchHarnesses', () => {
		const harness = prop('harness');
		expect(harness?.type).toBe('resourceLocator');
		const listMode = (harness?.modes ?? []).find((m) => m.name === 'list');
		expect(listMode?.typeOptions?.searchListMethod).toBe('searchHarnesses');
		const arnMode = (harness?.modes ?? []).find((m) => m.name === 'arn');
		expect(arnMode).toBeDefined();
	});

	it('carries identity on credentials, not hardcoded node fields', () => {
		// No identity dropdown, no user-id field, no bearer-token field on the node itself.
		expect(prop('identity')).toBeUndefined();
		expect(prop('userId')).toBeUndefined();
		expect(prop('bearerToken')).toBeUndefined();

		const creds = node.description.credentials ?? [];
		// AWS credential is the invocation identity (IAM / SigV4).
		expect(creds.some((c) => c.name === 'aws')).toBe(true);
		// On-behalf-of-user identity is an optional separate credential on top.
		const obo = creds.find((c) => c.name === 'httpBearerAuth');
		expect(obo).toBeDefined();
		expect(obo?.required).toBe(false);
	});

	it('supports session lifecycle: new vs resume', () => {
		const sessionMode = prop('sessionMode');
		expect(sessionMode?.type).toBe('options');
		const values = (sessionMode?.options ?? []).map((o) => (o as { value: string }).value);
		expect(values).toEqual(['new', 'resume']);
		expect(sessionMode?.default).toBe('new');
		// Session ID is only requested when resuming a conversation.
		expect(prop('sessionId')?.displayOptions?.show?.sessionMode).toEqual(['resume']);
	});

	it('exposes an advanced options collection (region lives inside it)', () => {
		// Region is a secondary override, so it belongs inside the collection, not top-level.
		expect(prop('region')).toBeUndefined();
		const options = prop('options');
		expect(options?.type).toBe('collection');
		const optionNames = ((options?.options ?? []) as Array<{ name: string }>).map((o) => o.name);
		expect(optionNames).toEqual(
			expect.arrayContaining([
				'region',
				'qualifier',
				'actorId',
				'systemPrompt',
				'model',
				'maxIterations',
				'maxTokens',
				'timeout',
				'allowedTools',
				'streaming',
			]),
		);
	});
});

describe('AWS AI Agent node — searchHarnesses', () => {
	const node = new AwsAiAgent();
	const ctx = mockDeep<ILoadOptionsFunctions>();

	it('returns fake harnesses with name and ARN value', async () => {
		const result = await node.methods.listSearch.searchHarnesses.call(ctx);
		expect(result.results.length).toBeGreaterThanOrEqual(3);
		for (const r of result.results) {
			expect(typeof r.name).toBe('string');
			expect(r.value).toMatch(/^arn:aws:bedrock-agentcore:/);
		}
	});

	it('filters harnesses case-insensitively by name', async () => {
		const result = await node.methods.listSearch.searchHarnesses.call(ctx, 'sales');
		expect(result.results.length).toBe(1);
		expect(result.results[0].name.toLowerCase()).toContain('sales');
	});
});

describe('AWS AI Agent node — execute (stubbed)', () => {
	const node = new AwsAiAgent();

	const setup = (params: Record<string, unknown>) => {
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i?: number, fallback?: unknown) => (params[name] ?? fallback) as never,
		);
		ctx.helpers.returnJsonArray.mockImplementation(
			(data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })) as never,
		);
		return ctx;
	};

	it('resumes an existing conversation by echoing the provided session ID', async () => {
		const ctx = setup({ input: 'hello agent', sessionMode: 'resume', sessionId: 'sess-123' });
		const result = await node.execute.call(ctx);
		const json = result[0][0].json as {
			response: string;
			sessionId: string;
			sessionMode: string;
			usage: { inputTokens: number; outputTokens: number };
			traceRefs: string[];
		};
		expect(json.response).toContain('hello agent');
		expect(json.sessionMode).toBe('resume');
		expect(json.sessionId).toBe('sess-123');
		expect(typeof json.usage.inputTokens).toBe('number');
		expect(typeof json.usage.outputTokens).toBe('number');
		expect(Array.isArray(json.traceRefs)).toBe(true);
	});

	it('starts a new conversation with a generated session ID', async () => {
		const ctx = setup({ input: 'hi', sessionMode: 'new' });
		const result = await node.execute.call(ctx);
		const json = result[0][0].json as { sessionMode: string; sessionId: string };
		expect(json.sessionMode).toBe('new');
		expect(json.sessionId).toMatch(/^sess-/);
	});

	it('catches and returns error when continueOnFail is true', async () => {
		const ctx = setup({ input: 'test', sessionMode: 'resume', sessionId: 'sess-456' });
		ctx.continueOnFail.mockReturnValue(true);
		ctx.getNodeParameter.mockImplementation(() => {
			throw new Error('boom');
		});
		const result = await node.execute.call(ctx);
		expect((result[0][0].json as { error: string }).error).toBe('boom');
	});
});
