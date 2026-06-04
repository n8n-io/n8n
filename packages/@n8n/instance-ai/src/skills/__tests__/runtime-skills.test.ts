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
				'Designs and manages n8n Data Tables directly with the data-tables and parse-file tools. Use when the user asks to create, inspect, import, seed, query, update, clean up, rename columns in, or delete data tables and rows, especially from CSV/XLSX/JSON attachments, and before planning workflows that create or write to Data Tables.',
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

	it('loads the bundled Computer Use credential setup skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find(
			(entry) => entry.name === 'credential-setup-with-computer-use',
		);

		expect(skill?.name).toBe('credential-setup-with-computer-use');
		for (const tool of [
			'research',
			'ask-user',
			'browser_connect',
			'browser_snapshot',
			'browser_capture_secret',
			'browser_create_credential',
		]) {
			expect(skill?.recommendedTools).toContain(tool);
		}
		expect(skill?.linkedFiles.references).toEqual([]);

		const loaded = await source.loadSkill('credential-setup-with-computer-use');
		expect(loaded?.instructions).toContain('Computer Use browser tools');
		expect(loaded?.instructions).toContain('browser_capture_secret');
		expect(loaded?.instructions).toContain('interactive: false');
		expect(loaded?.instructions).toContain('`ref`');
		expect(loaded?.instructions).toContain('`redactedKey`');
		expect(loaded?.instructions).toContain('same `credentialsKey`');
		expect(loaded?.instructions).toContain('`data`');
		expect(loaded?.instructions).toContain('`resolveData`');
		expect(loaded?.instructions).not.toMatch(/MCP|devtools/i);
	});

	it('loads the bundled workflow-builder skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'workflow-builder');

		expect(skill?.name).toBe('workflow-builder');
		expect(skill?.platforms).toBeUndefined();
		expect(skill?.recommendedTools).toEqual([
			'build-workflow',
			'workflows',
			'nodes',
			'data-tables',
			'credentials',
			'verify-built-workflow',
			'executions',
		]);
		expect(skill?.description).toContain('former workflow-builder agent guidance');

		const loaded = await source.loadSkill('workflow-builder');
		expect(loaded?.instructions).toContain('Tool Surface');
		expect(loaded?.instructions).toContain('build-workflow');
		expect(loaded?.instructions).toContain('nodes(action="suggested")');
		expect(loaded?.instructions).toContain('nodes(action="search")');
		expect(loaded?.instructions).toContain('workflows(action="get-as-code")');
		expect(loaded?.instructions).toContain("newCredential('Credential Name', 'credential-id')");
		expect(loaded?.instructions).toContain('Verification');
		expect(loaded?.instructions).toContain('Build/save success is not workflow-quality evidence');
		expect(loaded?.instructions).toContain('workflows(action="get-json", workflowId)');
		expect(loaded?.instructions).toMatch(/inline setup card in the AI\s+Assistant panel/);
		expect(loaded?.instructions).toContain('Do not call `delegate`');
	});
});
