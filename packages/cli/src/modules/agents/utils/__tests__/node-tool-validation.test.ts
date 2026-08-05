import type { AgentJsonToolConfig } from '@n8n/api-types';

import { validateNodeToolConfigs } from '../node-tool-validation';

const { mockValidateNodeConfig } = vi.hoisted(() => ({
	mockValidateNodeConfig: vi.fn(),
}));

vi.mock('@n8n/workflow-sdk', () => ({
	getSchemaBaseDirs: () => [],
	setSchemaBaseDirs: vi.fn(),
	validateNodeConfig: (...args: unknown[]) => mockValidateNodeConfig(...args),
}));

const nodeTool = (operation: string): AgentJsonToolConfig => ({
	type: 'node',
	name: 'Slack',
	node: {
		nodeType: 'n8n-nodes-base.slackTool',
		nodeTypeVersion: 2.2,
		nodeParameters: { resource: 'message', operation },
	},
});

describe('validateNodeToolConfigs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });
	});

	it.each(['sendAndWait', 'dispatchAndWait'])(
		'rejects unsupported operation %s with approval guidance',
		async (operation) => {
			const result = await validateNodeToolConfigs([nodeTool(operation)]);

			expect(result).toContain(`"${operation}"`);
			expect(result).toContain('requireApproval: true');
			expect(mockValidateNodeConfig).not.toHaveBeenCalled();
		},
	);

	it('accepts a normal send operation', async () => {
		const result = await validateNodeToolConfigs([nodeTool('post')]);

		expect(result).toBeNull();
		expect(mockValidateNodeConfig).toHaveBeenCalledOnce();
	});
});
