import type { SuperAgentTest } from './types';

export const testWithAPIKey = async (
	agent: SuperAgentTest,
	method: 'get' | 'post' | 'put' | 'patch' | 'delete',
	url: string,
	apiKey: string | null,
) => {
	void agent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await agent[method](url);
	expect(response.statusCode).toBe(401);
};
