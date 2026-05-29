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

	it('loads the bundled workflow-builder skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const workflowBuilder = source.registry.skills.find(
			(skill) => skill.name === 'workflow-builder',
		);

		expect(workflowBuilder).toMatchObject({
			name: 'workflow-builder',
			description:
				'Builds and edits n8n workflows directly with the workflow SDK and the workflows tool. Use for existing-workflow edits, fixes, node rewiring, credential-preserving patches, verification, setup routing, and workflow creation only inside approved planned build follow-up turns. Do not load on a normal new-workflow request; call plan first, then load this skill from the approved build-workflow follow-up.',
			platforms: ['daytona'],
			recommendedTools: [
				'workflows',
				'verify-built-workflow',
				'executions',
				'credentials',
				'nodes',
				'data-tables',
				'parse-file',
				'ask-user',
			],
		});
		expect(workflowBuilder?.linkedFiles.references).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'references/branch-tracing.md' }),
				expect.objectContaining({ path: 'references/build-lifecycle.md' }),
				expect.objectContaining({ path: 'references/planned-build-followup.md' }),
				expect.objectContaining({ path: 'references/sdk-rules.md' }),
			]),
		);
		expect(workflowBuilder?.linkedFiles.references).toHaveLength(4);

		const loadTool = createSkillLoadTool(source);
		const loadResult = await loadTool.handler?.({ skillId: 'workflow-builder' }, {});
		expect(loadResult).toMatchObject({
			success: true,
			skillId: 'workflow-builder',
			name: 'workflow-builder',
		});
		if (
			!loadResult ||
			typeof loadResult !== 'object' ||
			!('content' in loadResult) ||
			typeof loadResult.content !== 'string'
		) {
			throw new Error('Expected load_skill to return workflow-builder content');
		}
		expect(loadResult.content).toContain('## Stop First');
		expect(loadResult.content).toContain(
			'This skill replaces the old detached workflow-builder agent',
		);
		expect(loadResult.content).toContain('Do not call `workflows(action="create")`');
		expect(loadResult.content).toContain('Do not use `workflows(action="update-json")`');

		const sdkRules = await loadTool.handler?.(
			{ skillId: 'workflow-builder', filePath: 'references/sdk-rules.md' },
			{},
		);
		expect(sdkRules).toMatchObject({
			success: true,
			skillId: 'workflow-builder',
			filePath: 'references/sdk-rules.md',
		});
		if (
			!sdkRules ||
			typeof sdkRules !== 'object' ||
			!('content' in sdkRules) ||
			typeof sdkRules.content !== 'string'
		) {
			throw new Error('Expected load_skill to return workflow-builder sdk rules');
		}
		expect(sdkRules.content).toContain('Do not use web search to learn workflow SDK syntax');
		expect(sdkRules.content).toContain(
			"workflow('example-workflow', 'Example Workflow').add(startTrigger).to(setFields)",
		);

		const lifecycle = await loadTool.handler?.(
			{ skillId: 'workflow-builder', filePath: 'references/build-lifecycle.md' },
			{},
		);
		if (
			!lifecycle ||
			typeof lifecycle !== 'object' ||
			!('content' in lifecycle) ||
			typeof lifecycle.content !== 'string'
		) {
			throw new Error('Expected load_skill to return workflow-builder lifecycle');
		}
		expect(lifecycle.content).toContain('The canonical workflow-building lifecycle');
		expect(lifecycle.content).toContain('verify-built-workflow');
		expect(lifecycle.content).toContain('Publish only when the user explicitly asks');
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
});
