import type {
	ICredentialsHelper,
	INodeProperties,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { baseUrlProperty, SimCredentialsHelper } from '../sim-credentials-helper';

const PROXY = 'http://127.0.0.1:4567';

const urlProperty = (name: string, defaultValue: string): INodeProperties => ({
	displayName: name,
	name,
	type: 'string',
	default: defaultValue,
});

async function decrypt(data: Record<string, unknown>, properties: INodeProperties[]) {
	const inner = mock<ICredentialsHelper>();
	inner.getDecrypted.mockResolvedValue(data as never);
	inner.getCredentialsProperties.mockReturnValue(properties);
	return await new SimCredentialsHelper(inner, PROXY).getDecrypted(
		mock<IWorkflowExecuteAdditionalData>(),
		{ id: 'cred-1', name: 'cred' },
		'someApi',
		'evaluation',
	);
}

describe('SimCredentialsHelper', () => {
	it('points a default base URL the sim server serves at the egress proxy', async () => {
		const data = await decrypt({ apiKey: 'sk-1' }, [
			urlProperty('url', 'https://api.openai.com/v1'),
		]);

		expect(data).toEqual({ apiKey: 'sk-1', url: `${PROXY}/sim/api.openai.com/v1` });
	});

	it('keeps the host and path of a base URL the credential sets', async () => {
		const data = await decrypt(
			{ apiKey: 'k', host: 'https://generativelanguage.googleapis.com/' },
			[urlProperty('host', 'https://generativelanguage.googleapis.com')],
		);

		expect(data.host).toBe(`${PROXY}/sim/generativelanguage.googleapis.com`);
	});

	it('points any other base URL at the proxy too, which refuses what the sim server does not serve', async () => {
		const data = await decrypt({ apiKey: 'k', url: 'https://llm.internal.example:8443/v1' }, [
			urlProperty('url', 'https://api.openai.com/v1'),
		]);

		expect(data.url).toBe(`${PROXY}/sim/llm.internal.example:8443/v1`);
	});

	it('leaves a credential without a base URL alone', async () => {
		const data = await decrypt({ accessToken: 'xoxb-1' }, []);

		expect(data).toEqual({ accessToken: 'xoxb-1' });
	});
});

describe('baseUrlProperty', () => {
	it('finds the base URL field by name and URL default', () => {
		expect(
			baseUrlProperty([urlProperty('apiKey', ''), urlProperty('url', 'https://api.anthropic.com')])
				?.name,
		).toBe('url');
		expect(baseUrlProperty([urlProperty('host', 'not-a-url')])).toBeUndefined();
	});
});
