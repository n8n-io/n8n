import { resolveNodeAnnotations } from 'n8n-workflow';

import { AgentTool } from '../AgentTool.node';

describe('AI Agent Tool, annotations', () => {
	const agentTool = new AgentTool();

	describe.each([2.2, 3])('version %s', (typeVersion) => {
		const { description } = agentTool.getNodeType(typeVersion);

		it.each([
			{},
			{
				hasOutputParser: true,
				needsFallback: true,
				options: {
					tracingMetadata: {
						values: [{ key: 'env', type: 'booleanValue', booleanValue: 'true' }],
					},
				},
			},
		])('should resolve %j to the restrictive default', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual({
				effect: 'write',
				destructive: true,
				idempotent: false,
			});
		});
	});
});
