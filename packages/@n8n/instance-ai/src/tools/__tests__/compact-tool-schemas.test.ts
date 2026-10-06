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
		'workflows is unchanged (folder exploration %s)',
		(folderExplorationEnabled) => {
			const on = createWorkflowsTool(
				context({ nodeContractsEnabled: true, folderExplorationEnabled }),
			);
			const off = createWorkflowsTool(context({ folderExplorationEnabled }));

			expect(on.description).toBe(off.description);
			expect(jsonOf(on)).toEqual(jsonOf(off));
		},
	);

	it('nodes changes only the build discovery text', () => {
		const on = jsonOf(createNodesTool(context({ nodeContractsEnabled: true }))).properties ?? {};
		const off = jsonOf(createNodesTool(context({}))).properties ?? {};
		const discovery = [
			'action',
			'connectionType',
			'currentNodeParameters',
			'limit',
			'methodName',
			'nodeTypes',
			'queries',
		];
		const actionText = (properties: Record<string, unknown>, action: string) =>
			String((properties.action as { description?: string }).description)
				.split(/(?="[a-z-]+": )/)
				.find((part) => part.startsWith(`"${action}": `));

		for (const key of Object.keys(off).filter((name) => !discovery.includes(name))) {
			expect(on[key]).toEqual(off[key]);
		}
		for (const action of ['list', 'explore-resources', 'execute']) {
			expect(actionText(on, action)).toBeDefined();
			expect(actionText(on, action)).toBe(actionText(off, action));
		}
	});

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
