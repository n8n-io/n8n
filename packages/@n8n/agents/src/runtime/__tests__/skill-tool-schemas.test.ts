import { z } from 'zod';

import { createRuntimeSkillSource } from '../../skills/registry';
import { createSkillLoadTool } from '../../skills/tools';
import type { BuiltTool } from '../../types/sdk/tool';
import { withSkillToolSchemas } from '../skills/skill-tool-schemas';
import { ToolCatalog } from '../tools/tool-catalog';

const searchNodes: BuiltTool = {
	name: 'search_nodes',
	description: 'Search nodes.',
	inputSchema: z.object({ queries: z.array(z.string()) }),
	handler: async () => await Promise.resolve({}),
};

const source = createRuntimeSkillSource([
	{
		id: 'builder',
		name: 'builder',
		description: 'Build workflows.',
		instructions: 'Search nodes, then build.',
		recommendedTools: ['search_nodes', 'read_file'],
	},
	{ id: 'plain', name: 'plain', description: 'No tools.', instructions: 'Just talk.' },
]);

function loadSkillTool() {
	return withSkillToolSchemas(
		createSkillLoadTool(source),
		new ToolCatalog([searchNodes]),
		source.registry,
	);
}

describe('withSkillToolSchemas', () => {
	it('returns the schemas of the catalog tools a loaded skill recommends', async () => {
		const output = await loadSkillTool().handler!({ skillId: 'builder' }, {});

		expect(output).toMatchObject({ type: 'content' });
		const texts = (output as { value: Array<{ text: string }> }).value.map((part) => part.text);
		const schemaText = texts.at(-1)!;
		// read_file is not in the catalog, so only search_nodes comes back.
		expect(schemaText).toContain('"name":"search_nodes"');
		expect(schemaText).toContain('"queries"');
		expect(schemaText).not.toContain('read_file');
	});

	it('returns the schemas in an activated load result', async () => {
		const activate = vi.fn().mockResolvedValue(source.loadSkill('builder'));
		const output = await loadSkillTool().handler!({ skillId: 'builder' }, { loadSkill: activate });

		expect(output).toMatchObject({
			success: true,
			toolSchemas: [{ name: 'search_nodes', inputSchema: expect.any(Object) }],
		});
	});

	it('leaves a skill without catalog tools unchanged', async () => {
		const output = await loadSkillTool().handler!({ skillId: 'plain' }, {});

		expect((output as { value: unknown[] }).value).toHaveLength(1);
	});
});
