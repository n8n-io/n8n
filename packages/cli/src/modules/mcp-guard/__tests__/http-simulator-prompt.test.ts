import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { createLlmMockHandler } from '../../instance-ai/eval/mock-handler';

const prompts: string[] = [];

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: () => {
		const agent = {
			tool: () => agent,
			generate: async (prompt: string) => {
				prompts.push(prompt);
				return { messages: [], finishReason: 'stop' };
			},
		};
		return agent;
	},
	extractText: () => '',
}));

const SECRETS = [
	'qs-secret',
	'url-secret',
	'body-secret',
	'hdr-secret',
	'param-secret',
	'abc123tok',
];

describe('the prompt of the simulator', () => {
	beforeEach(() => {
		prompts.length = 0;
		const sink = () => {};
		Container.set(Logger, {
			info: sink,
			warn: sink,
			error: sink,
			debug: sink,
		} as unknown as Logger);
	});

	it('holds no secret of the request or of the node parameters', async () => {
		const node = {
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequestTool',
			parameters: {
				method: 'POST',
				url: 'https://api.unknown.test/v1/tasks',
				sendHeaders: true,
				headerParameters: { parameters: [{ name: 'X-Api-Key', value: 'param-secret' }] },
				authToken: 'abc123tok',
			},
		} as unknown as INode;

		await createLlmMockHandler({ maxRetries: 0, redactSecrets: true })(
			{
				url: 'https://api.unknown.test/v1/tasks?api_key=url-secret&page=2',
				method: 'POST',
				qs: { access_token: 'qs-secret' },
				body: { password: 'body-secret', title: 'Buy milk' },
				headers: { authorization: 'Bearer hdr-secret' },
			},
			node,
		);

		expect(prompts.length).toBeGreaterThan(0);
		for (const prompt of prompts) {
			for (const secret of SECRETS) expect(prompt).not.toContain(secret);
			expect(prompt).toContain('Buy milk');
		}
	});
});
