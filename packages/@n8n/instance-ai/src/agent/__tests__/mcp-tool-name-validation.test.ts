import type { BuiltTool } from '@n8n/agents';

import { addSafeMcpTools, createClaimedToolNames } from '../mcp-tool-name-validation';

type ToolRegistry = Record<string, BuiltTool>;

function makeTools(names: string[]): ToolRegistry {
	return Object.fromEntries(names.map((name) => [name, { name, description: name }]));
}

describe('MCP tool name validation', () => {
	it('allows external tool names that contain native tool names as suffixes', () => {
		const target: ToolRegistry = {};

		addSafeMcpTools(target, makeTools(['github_workflows', 'custom_plan']), {
			source: 'external MCP',
			claimedToolNames: createClaimedToolNames(['workflows', 'plan']),
		});

		expect(target.github_workflows).toBeDefined();
		expect(target.custom_plan).toBeDefined();
	});

	it('still skips exact normalized name collisions with native tools', () => {
		const target: ToolRegistry = {};
		const warn = jest.fn();

		addSafeMcpTools(target, makeTools(['work-flows']), {
			source: 'external MCP',
			claimedToolNames: createClaimedToolNames(['workflows']),
			warn,
		});

		expect(target['work-flows']).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'external MCP',
				toolName: 'work-flows',
			}),
		);
	});
});
