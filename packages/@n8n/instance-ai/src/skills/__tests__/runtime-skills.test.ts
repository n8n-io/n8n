import { createSkillLoadTool } from '@n8n/agents';
import { existsSync } from 'node:fs';

import { INSTANCE_AI_SKILLS_DIR, loadInstanceAiRuntimeSkillSource } from '../runtime-skills';

describe('Instance AI runtime skills', () => {
	it('loads the bundled data-table-manager skill and its linked files', async () => {
		expect(existsSync(INSTANCE_AI_SKILLS_DIR)).toBe(true);

		const source = loadInstanceAiRuntimeSkillSource();
		const dataTableManager = source.registry.skills.find(
			(skill) => skill.name === 'data-table-manager',
		);

		expect(dataTableManager).toMatchObject({
			name: 'data-table-manager',
			description:
				'Designs and manages n8n Data Tables directly with the data-tables and parse-file tools. Use when the user asks to create, inspect, import, seed, query, update, clean up, rename columns in, or delete data tables and rows, especially from CSV/XLSX/JSON attachments.',
			platforms: ['daytona'],
			recommendedTools: ['data-tables', 'parse-file'],
		});
		expect(dataTableManager?.linkedFiles.references).toEqual([
			expect.objectContaining({ path: 'references/data-table-playbook.md' }),
		]);
		expect(dataTableManager?.linkedFiles.scripts).toEqual([]);

		const loadTool = createSkillLoadTool(source);
		const loadResult = await loadTool.handler?.(
			{ skillId: 'data-table-manager', filePath: 'references/data-table-playbook.md' },
			{},
		);
		expect(loadResult).toMatchObject({
			success: true,
			skillId: 'data-table-manager',
			name: 'data-table-manager',
			filePath: 'references/data-table-playbook.md',
		});
		if (
			!loadResult ||
			typeof loadResult !== 'object' ||
			!('content' in loadResult) ||
			typeof loadResult.content !== 'string'
		) {
			throw new Error('Expected load_skill to return file content');
		}
		expect(loadResult.content).toContain('Fast Routing');
	});
});
