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

	it('shows bearer token and user id only for oauth bearer identity', () => {
		for (const name of ['bearerToken', 'userId']) {
			const p = prop(name);
			expect(p?.displayOptions?.show?.identity).toEqual(['oauthBearer']);
		}
	});

	it('exposes region, session id and an advanced options collection', () => {
		expect(prop('region')?.type).toBe('options');
		expect(prop('sessionId')?.type).toBe('string');
		const options = prop('options');
		expect(options?.type).toBe('collection');
		const optionNames = ((options?.options ?? []) as Array<{ name: string }>).map((o) => o.name);
		expect(optionNames).toEqual(
			expect.arrayContaining([
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
