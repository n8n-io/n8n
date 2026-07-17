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

	it('has an identity selector with the three modes', () => {
		const identity = prop('identity');
		const values = (identity?.options ?? []).map((o) => (o as { value: string }).value);
		expect(values).toEqual(['iamPrincipal', 'oauthBearer', 'workloadIdentity']);
		expect(identity?.default).toBe('iamPrincipal');
	});

	it('shows user id only for oauth bearer identity', () => {
		const p = prop('userId');
		expect(p?.displayOptions?.show?.identity).toEqual(['oauthBearer']);
	});

	it('keeps authentication/secret fields out of the node properties', () => {
		// The bearer token is an auth secret and must come from the credential, not a node field.
		expect(prop('bearerToken')).toBeUndefined();
	});

	it('exposes session id and an advanced options collection (region lives inside it)', () => {
		expect(prop('sessionId')?.type).toBe('string');
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

	it('returns a correctly shaped fake response', async () => {
		const ctx = setup({ input: 'hello agent', sessionId: 'sess-123' });
		const result = await node.execute.call(ctx);
		const json = result[0][0].json as {
			response: string;
			sessionId: string;
			usage: { inputTokens: number; outputTokens: number };
			traceRefs: string[];
		};
		expect(json.response).toContain('hello agent');
		expect(json.sessionId).toBe('sess-123');
		expect(typeof json.usage.inputTokens).toBe('number');
		expect(typeof json.usage.outputTokens).toBe('number');
		expect(Array.isArray(json.traceRefs)).toBe(true);
	});

	it('catches and returns error when continueOnFail is true', async () => {
		const ctx = setup({ input: 'test', sessionId: 'sess-456' });
		ctx.continueOnFail.mockReturnValue(true);
		ctx.getNodeParameter.mockImplementation(() => {
			throw new Error('boom');
		});
		const result = await node.execute.call(ctx);
		expect((result[0][0].json as { error: string }).error).toBe('boom');
	});
});
