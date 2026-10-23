import type request from 'supertest';

import type { SuperAgentTest } from './types';

export const requestWithAPIKey = async (
	agent: SuperAgentTest,
	method: 'get' | 'post' | 'put' | 'patch' | 'delete',
	url: string,
	apiKey: string | null,
): Promise<request.Response> => {
	void agent.set({ 'X-N8N-API-KEY': apiKey });
	return await agent[method](url);
};
