import { createSkillLoadTool } from '@n8n/agents';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INSTANCE_AI_SKILLS_DIR, loadInstanceAiRuntimeSkillSource } from '../runtime-skills';

describe('Instance AI runtime skills', () => {
	it('points the workflow-builder skill at the SDK language reference', () => {
		const skill = readFileSync(
			join(INSTANCE_AI_SKILLS_DIR, 'workflow-builder', 'SKILL.md'),
			'utf-8',
		);
		expect(skill).toContain('knowledge-base/reference/workflow-sdk-language.md');
	});

	it('loads the bundled data-table-manager skill and its linked files', async () => {
		expect(existsSync(INSTANCE_AI_SKILLS_DIR)).toBe(true);

		const source = loadInstanceAiRuntimeSkillSource();
		const dataTableManager = source.registry.skills.find(
			(skill) => skill.name === 'data-table-manager',
		);

		expect(dataTableManager).toMatchObject({
			name: 'data-table-manager',
			description:
				'Designs and manages n8n Data Tables directly with the data-tables and parse-file tools. Use when the user asks to list, show, create, inspect, import, seed, query, update, clean up, rename columns in, or delete data tables and rows, especially from CSV/XLSX/JSON attachments, and before building or planning workflows that create or write to Data Tables.',
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
		expect(skill?.description).toContain('Default path for all single-workflow work');
		expect(skill?.description).toContain('do not load planning or create-tasks first');

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
		expect(loaded?.instructions).toContain(
			'knowledge-base/reference/workflow-builder-guardrails.md',
		);
		expect(loaded?.instructions).toMatch(/inline setup card in the AI\s+Assistant panel/);
		expect(loaded?.instructions).toContain('Do not call `delegate`');
		expect(loaded?.instructions).toContain('.to(isImportant)');
		expect(loaded?.instructions).toContain('.onTrue(handleImportant)');
		expect(loaded?.instructions).toContain('Never call `.onFalse()` more than once');
		expect(loaded?.instructions).toContain('branch nodes are omitted from the saved graph');
	});

	it('loads the bundled planning skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'planning');

		expect(skill?.name).toBe('planning');
		expect(skill?.recommendedTools).toEqual([
			'create-tasks',
			'workflows',
			'nodes',
			'credentials',
			'data-tables',
			'parse-file',
			'research',
			'ask-user',
		]);
		expect(skill?.description).toContain('Do NOT use for new one-off workflows');

		const loaded = await source.loadSkill('planning');
		expect(loaded?.instructions).toContain('## When NOT to use this skill');
		expect(loaded?.instructions).toContain('Do not call `create-tasks` just to get approval');
		expect(loaded?.instructions).toContain('planningContext.source: "planning-skill"');
		expect(loaded?.instructions).toContain('Do not spawn another agent');
		expect(loaded?.instructions).toContain('`Required effects`');
		expect(loaded?.instructions).toContain('`Explicit constraints`');
		expect(loaded?.instructions).toContain('`Empty/invalid behavior`');
		expect(loaded?.instructions).toContain('`Verify required effects`');
		expect(loaded?.instructions).toContain("Never ask for the user's timezone");
		expect(loaded?.instructions).toContain('Trust already-collected briefing context');
		expect(loaded?.instructions).toContain('Do not add\nroutine "verify this workflow"');
		expect(loaded?.instructions).toContain('Checkpoint tasks are exceptional semantic checks');
		expect(loaded?.instructions).not.toContain('submit-plan');
		expect(loaded?.instructions).not.toContain('add-plan-item');
	});

	it('loads the bundled post-build-flow skill and trigger input reference', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'post-build-flow');

		expect(skill?.description).toContain('workflow-verification-follow-up');
		expect(skill?.linkedFiles.references).toEqual([
			expect.objectContaining({ path: 'references/trigger-input-data-shapes.md' }),
		]);

		const loaded = await source.loadSkill('post-build-flow');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "ready"');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "needs_setup"');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "not_verifiable"');
		expect(loaded?.instructions).toContain('setupRequirement.status === "required"');
		expect(loaded?.instructions).toContain('inline setup card in the AI Assistant panel');
		expect(loaded?.instructions).toMatch(
			/Do not ask whether to build now and set up\s+credentials later/,
		);
		expect(loaded?.instructions).toContain(
			'Ask once when a service has multiple credentials of the same type',
		);
		expect(loaded?.instructions).toContain(
			'Ask which auth type to use when a service supports more than one',
		);
		expect(loaded?.instructions).toContain(
			'Only call `workflows(action="publish")` when the user explicitly asks',
		);

		const loadTool = createSkillLoadTool(source);
		const reference = await loadTool.handler?.(
			{ skillId: 'post-build-flow', filePath: 'references/trigger-input-data-shapes.md' },
			{},
		);
		if (
			!reference ||
			typeof reference !== 'object' ||
			!('content' in reference) ||
			typeof reference.content !== 'string'
		) {
			throw new Error('Expected trigger input reference content');
		}
		expect(reference.content).toContain('Do NOT wrap in `formFields`');
	});

	it('loads the bundled planned-task-runtime skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'planned-task-runtime');

		expect(skill?.description).toContain('planned-task-follow-up');

		const loaded = await source.loadSkill('planned-task-runtime');
		expect(loaded?.instructions).toContain('<planned-task-follow-up type="synthesize">');
		expect(loaded?.instructions).toContain('You MUST take action in this same turn');
		expect(loaded?.instructions).toContain('awaiting_replan');
		expect(loaded?.instructions).toMatch(/Do NOT reply with an\s+acknowledgement/);
		expect(loaded?.instructions).toContain('<planned-task-follow-up type="build-workflow">');
		expect(loaded?.instructions).toContain('<planned-task-follow-up type="checkpoint">');
		expect(loaded?.instructions).toContain('Always require structured verification evidence');
		expect(loaded?.instructions).toContain('never trust builder prose');
		expect(loaded?.instructions).toContain('before `complete-checkpoint`');
		expect(loaded?.instructions).toContain('patch in place');
		expect(loaded?.instructions).toContain('within two rounds');
		expect(loaded?.instructions).toContain('<background-task-completed>');
		expect(loaded?.instructions).toContain('Never poll and never sleep');
	});

	it('loads the bundled debugging-executions skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'debugging-executions');

		expect(skill?.recommendedTools).toEqual(['executions', 'workflows']);

		const loaded = await source.loadSkill('debugging-executions');
		expect(loaded?.instructions).toContain('executions(action="debug")');
		expect(loaded?.instructions).toContain(
			'executions(action="get-resolved-node-parameters", executionId, nodeName)',
		);
		expect(loaded?.instructions).toContain('unreconstructable-context');
		expect(loaded?.instructions).toContain('do this unprompted');
	});
});
