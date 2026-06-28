import { createWorkspaceTools } from '@n8n/agents';

import { IGNORED_WORKSPACE_TOOLS, REPLAYED_WORKSPACE_TOOL_ARGS } from '../harness/langsmith-seed';

// The seed reconstructor replays @n8n/agents workspace file ops by matching tool
// names + arg keys (langsmith-seed.ts). @n8n/agents doesn't export those, so pin
// the duplicated names/keys against the live factory here — a rename or new tool
// there fails this test instead of silently turning a replayed mutation into a no-op.
describe('workspace tool contract (@n8n/agents drift guard)', () => {
	const liveByName = new Map(
		createWorkspaceTools({ filesystem: {} } as unknown as Parameters<
			typeof createWorkspaceTools
		>[0]).map((tool) => [tool.name, tool] as const),
	);

	it('classifies every live filesystem tool as replayed or intentionally ignored', () => {
		const classified = [...Object.keys(REPLAYED_WORKSPACE_TOOL_ARGS), ...IGNORED_WORKSPACE_TOOLS];
		expect([...liveByName.keys()].sort()).toEqual(classified.sort());
	});

	it('reads only arg keys the live tool schema still defines', () => {
		for (const [name, args] of Object.entries(REPLAYED_WORKSPACE_TOOL_ARGS)) {
			const schema = liveByName.get(name)?.inputSchema;
			// Duck-type the Zod object shape — cross-package `instanceof` is unreliable.
			const liveKeys =
				schema && typeof schema === 'object' && 'shape' in schema
					? Object.keys((schema as { shape: Record<string, unknown> }).shape)
					: [];
			expect(liveKeys, `${name} exposes no Zod object schema`).not.toHaveLength(0);
			for (const key of args) {
				expect(liveKeys, `${name} no longer defines arg "${key}"`).toContain(key);
			}
		}
	});
});
