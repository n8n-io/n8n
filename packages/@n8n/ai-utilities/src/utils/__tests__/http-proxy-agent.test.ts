import { createRequire } from 'node:module';

import { getProxyAgent } from '../http-proxy-agent';

const require = createRequire(__filename);

describe('http-proxy-agent', () => {
	it('resolves undici v7, whose dispatchers the global fetch of every supported Node accepts', () => {
		// A v6 dispatcher handed to the global fetch of Node >= 26 rejects its
		// dispatch handlers ('invalid onError method'), so every LLM/embedding
		// call fails with an opaque 'fetch failed'. See module doc.
		const { version } = require('undici/package.json') as { version: string };
		expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(7);
	});

	it('returns a shared agent for default options', () => {
		expect(getProxyAgent('https://api.openai.com/v1')).toBe(
			getProxyAgent('https://api.anthropic.com'),
		);
	});
});
