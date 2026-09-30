import { zodToJsonSchema } from '@n8n/agents';

import { createNodesTool } from '../nodes.tool';
import { createWorkflowsTool } from '../workflows.tool';

const withoutDescriptions = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(withoutDescriptions)
		: value && typeof value === 'object'
			? Object.fromEntries(
					Object.entries(value)
						.filter(([key]) => key !== 'description')
						.map(([key, entry]) => [key, withoutDescriptions(entry)]),
				)
			: value;

function context(flags: { nodeContractsEnabled?: boolean; folderExplorationEnabled?: boolean }) {
	return {
		...flags,
		permissions: {},
		workflowService: { nodeUsage: vi.fn(), listVersions: vi.fn(), updateVersion: vi.fn() },
		nodeService: {},
		credentialService: {},
	} as never;
}

const jsonOf = (tool: { inputSchema?: unknown }) =>
	zodToJsonSchema(tool.inputSchema as never) as { properties?: Record<string, unknown> };

describe('node contracts tool schemas', () => {
	it.each([false, true])(
		'workflows keeps every action and field (folder exploration %s)',
		(folderExplorationEnabled) => {
			const on = jsonOf(
				createWorkflowsTool(context({ nodeContractsEnabled: true, folderExplorationEnabled })),
			);
			const off = jsonOf(createWorkflowsTool(context({ folderExplorationEnabled })));

			expect(withoutDescriptions(on)).toEqual(withoutDescriptions(off));
			expect(JSON.stringify(on).length).toBeLessThan(JSON.stringify(off).length);
		},
	);

	it('nodes keeps every action and field', () => {
		const on = jsonOf(createNodesTool(context({ nodeContractsEnabled: true })));
		const off = jsonOf(createNodesTool(context({})));

		expect(Object.keys(on.properties ?? {})).toEqual(
			expect.arrayContaining(Object.keys(off.properties ?? {})),
		);
		expect(withoutDescriptions(on.properties?.action)).toEqual(
			withoutDescriptions(off.properties?.action),
		);
		expect(JSON.stringify(on).length).toBeLessThan(JSON.stringify(off).length);
	});
});
