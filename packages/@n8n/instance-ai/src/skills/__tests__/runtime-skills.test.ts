import { createSkillLoadTool } from '@n8n/agents';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INSTANCE_AI_SKILLS_DIR, loadInstanceAiRuntimeSkillSource } from '../runtime-skills';
import { CONFIG_EVALS_SKILL_ID, disabledInstanceAiSkillIds } from '../skill-gates';

const ORIGINAL_ENABLED_MODULES = process.env.N8N_ENABLED_MODULES;
const AGENTS_MODULE_SKILL_IDS = ['agent-builder', 'intent-recognition'] as const;

describe('Instance AI runtime skills', () => {
	afterEach(() => {
		if (ORIGINAL_ENABLED_MODULES === undefined) {
			delete process.env.N8N_ENABLED_MODULES;
		} else {
			process.env.N8N_ENABLED_MODULES = ORIGINAL_ENABLED_MODULES;
		}
	});

	it('points the workflow-builder skill at the SDK language reference', () => {
		const skill = readFileSync(
			join(INSTANCE_AI_SKILLS_DIR, 'workflow-builder', 'SKILL.md'),
			'utf-8',
		);
		expect(skill).toContain('knowledge-base/reference/workflow-sdk-language.md');
	});

	// The builder agent has been observed recalling a pre-ADO-5627 `.group()` signature
	// with no description argument, so the call is spelled out in the skill itself
	// rather than only linked — a wrong prior is not corrected by a pointer.
	it('states the node-group call and points at the node-groups reference', () => {
		const skill = readFileSync(
			join(INSTANCE_AI_SKILLS_DIR, 'workflow-builder', 'SKILL.md'),
			'utf-8',
		);
		expect(skill).toContain('knowledge-base/reference/node-groups.md');
		expect(skill).toContain('.group(name, members, { description })');
	});

	it('defers sticky and other SDK defects to workflow-sdk validate', () => {
		const skill = readFileSync(
			join(INSTANCE_AI_SKILLS_DIR, 'workflow-builder', 'SKILL.md'),
			'utf-8',
		);
		expect(skill).toContain('unsolicited `sticky()`');
		expect(skill).toContain('workflow-sdk validate');
		expect(skill).not.toMatch(/import \{\n(?:[^\n]*\n)*?\s*sticky,/);
	});

	it('loads the bundled credential-recipe-research skill', () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const recipeResearch = source.registry.skills.find(
			(skill) => skill.name === 'credential-recipe-research',
		);

		expect(recipeResearch).toMatchObject({
			name: 'credential-recipe-research',
			recommendedTools: ['research', 'workflows'],
		});
		expect(recipeResearch?.description).toContain('Load before composing');
		expect(recipeResearch?.description).toContain('credentialHints');
	});

	it('routes recipe composition through the research skill', () => {
		const postBuildFlow = readFileSync(
			join(INSTANCE_AI_SKILLS_DIR, 'post-build-flow', 'SKILL.md'),
			'utf-8',
		);
		expect(postBuildFlow).toMatch(/load the\s+`credential-recipe-research` skill/);
	});

	it('loads the bundled data-table-manager skill and its linked files', async () => {
		expect(existsSync(INSTANCE_AI_SKILLS_DIR)).toBe(true);

		const source = loadInstanceAiRuntimeSkillSource();
		const dataTableManager = source.registry.skills.find(
			(skill) => skill.name === 'data-table-manager',
		);

		expect(dataTableManager).toMatchObject({
			name: 'data-table-manager',
			platforms: ['daytona'],
			recommendedTools: ['data-tables', 'parse-file'],
		});
		expect(dataTableManager?.description).toContain(
			'Load before calling data-tables or parse-file',
		);
		expect(dataTableManager?.description).toContain('what data tables do I have?');
		expect(dataTableManager?.description).toContain(
			'load before building or planning workflows that create or write to Data Tables',
		);
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

		const loaded = await source.loadSkill('data-table-manager');
		expect(loaded?.instructions).toContain('## Routing');
		expect(loaded?.instructions).toContain('For workflow builds that create or write Data Tables');
		expect(loaded?.instructions).toContain('`workflow-builder`');
		expect(loaded?.instructions).toContain('before `build-workflow`');
	});

	it('loads the bundled config-evals skill and its linked files', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const configEvals = source.registry.skills.find((skill) => skill.name === 'config-evals');

		expect(configEvals).toMatchObject({
			name: 'config-evals',
			platforms: ['daytona'],
			recommendedTools: ['eval-config', 'data-tables'],
		});
		expect(configEvals?.linkedFiles.references).toEqual([
			expect.objectContaining({ path: 'references/config-eval-playbook.md' }),
		]);

		const loadTool = createSkillLoadTool(source);
		const loadResult = await loadTool.handler?.(
			{ skillId: 'config-evals', filePath: 'references/config-eval-playbook.md' },
			{},
		);
		expect(loadResult).toMatchObject({
			success: true,
			skillId: 'config-evals',
			name: 'config-evals',
			filePath: 'references/config-eval-playbook.md',
		});
		if (
			!loadResult ||
			typeof loadResult !== 'object' ||
			!('content' in loadResult) ||
			typeof loadResult.content !== 'string'
		) {
			throw new Error('Expected load_skill to return file content');
		}
		expect(loadResult.content).toContain('Config Eval Playbook');
	});

	it('gates the config-evals skill by its folder id', () => {
		expect(CONFIG_EVALS_SKILL_ID).toBe('config-evals');
		expect(disabledInstanceAiSkillIds({ configEvalsEnabled: false })).toContain(
			CONFIG_EVALS_SKILL_ID,
		);
		expect(disabledInstanceAiSkillIds({ configEvalsEnabled: true })).not.toContain(
			CONFIG_EVALS_SKILL_ID,
		);

		const source = loadInstanceAiRuntimeSkillSource();
		const configEvals = source.registry.skills.find((skill) => skill.name === 'config-evals');
		expect(configEvals?.id).toBe(CONFIG_EVALS_SKILL_ID);
	});

	it('excludes bundled Agents module skills unless the module is enabled', async () => {
		const source = await loadRuntimeSkillSourceWithEnabledModules('instance-ai');

		for (const skillId of AGENTS_MODULE_SKILL_IDS) {
			expect(source.registry.skills).not.toContainEqual(expect.objectContaining({ id: skillId }));
			await expect(source.loadSkill(skillId)).resolves.toBeNull();
		}
	});

	it('loads bundled Agents module skills when the module is enabled', async () => {
		const source = await loadRuntimeSkillSourceWithEnabledModules('instance-ai, agents');
		const loadTool = createSkillLoadTool(source);

		for (const skillId of AGENTS_MODULE_SKILL_IDS) {
			expect(source.registry.skills).toContainEqual(expect.objectContaining({ id: skillId }));
			await expect(source.loadSkill(skillId)).resolves.toMatchObject({ name: skillId });

			const loadResult = await loadTool.handler?.({ skillId }, {});
			expect(skillLoadText(loadResult)).toContain(`[Skill: "${skillId}"]`);
		}

		const agentBuilder = await source.loadSkill('agent-builder');
		expect(agentBuilder?.instructions).toContain('## Saved sub-agent dependencies');
		expect(agentBuilder?.instructions).toContain(
			'A saved sub-agent must be published before the parent can attach it',
		);
		expect(agentBuilder?.instructions).toMatch(
			/Never attach a draft child or pass its\s+raw `agentId`/,
		);
		expect(agentBuilder?.instructions).toContain('identify the child by its display name');
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

	it('loads the bundled n8n docs assistant skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'n8n-docs-assistant');

		expect(skill).toMatchObject({
			name: 'n8n-docs-assistant',
			recommendedTools: ['n8n-docs', 'credentials', 'nodes'],
		});
		expect(skill?.description).toContain('Load n8n-docs via load_tool before calling it');
		expect(skill?.description).toContain(
			'credential setup questions opened from the credential modal',
		);
		expect(skill?.linkedFiles.references).toEqual([]);

		const loaded = await source.loadSkill('n8n-docs-assistant');
		expect(loaded?.instructions).toContain('Before calling `n8n-docs`, load it via `load_tool`');
		expect(loaded?.instructions).toContain('n8n-docs(action="lookup")');
		expect(loaded?.instructions).toContain('intent: "credential-setup"');
		expect(loaded?.instructions).toContain('oauthRedirectUrl');
		expect(loaded?.instructions).toContain('never ask them to paste secrets into chat');
		expect(loaded?.instructions).toContain('Source: [Page title](page URL)');
		expect(loaded?.instructions).toContain('Sources:');
		expect(loaded?.instructions).toContain('pages returned by `n8n-docs`');
	});

	it('loads the bundled workflow-builder skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'workflow-builder');

		expect(skill?.name).toBe('workflow-builder');
		expect(skill?.platforms).toBeUndefined();
		expect(skill?.recommendedTools).toEqual([
			'read_file',
			'write_file',
			'edit_file',
			'execute_command',
			'build-workflow',
			'workflows',
			'nodes',
			'data-tables',
			'credentials',
			'verify-built-workflow',
			'executions',
		]);
		expect(skill?.description).toContain('Load before calling build-workflow');
		expect(skill?.description).toContain('Default path for all single-workflow work');
		expect(skill?.description).toContain('workflow-sdk validate');
		expect(skill?.description).toContain('load data-table-manager first');
		expect(skill?.description).toContain('Do not load planning or create-tasks first');

		const loaded = await source.loadSkill('workflow-builder');
		expect(loaded?.instructions).toContain('## Routing');
		expect(loaded?.instructions).toContain('build-workflow');
		expect(loaded?.instructions).toContain('filePath');
		expect(loaded?.instructions).toContain('workspace_write_file');
		expect(loaded?.instructions).toContain(
			'node --import tsx node_modules/@n8n/workflow-sdk/dist/cli/index.js validate',
		);
		expect(loaded?.instructions).toContain('workspace source file');
		expect(loaded?.instructions).toContain('nodes(action="suggested")');
		expect(loaded?.instructions).toContain('nodes(action="search")');
		expect(loaded?.instructions).toContain("newCredential('Credential Name', 'credential-id')");
		expect(loaded?.instructions).toContain('Verification');
		expect(loaded?.instructions).toContain('Build/save success is not workflow-quality evidence');
		expect(loaded?.instructions).toContain('postBuildFlow.required: true');
		expect(loaded?.instructions).toContain('follow the inlined\n    `postBuildFlow.instructions`');
		expect(loaded?.instructions).toContain('Do not call\n    `verify-built-workflow` directly');
		expect(loaded?.instructions).toContain('workflows(action="get-as-code", workflowId)');
		expect(loaded?.instructions).toContain('n8n has no global error workflow setting');
		expect(loaded?.instructions).toContain('references/error-workflows.md');
		expect(loaded?.instructions).toContain('settings.errorWorkflow');
		expect(loaded?.instructions).toContain(
			'knowledge-base/reference/workflow-builder-guardrails.md',
		);
		expect(loaded?.instructions).toContain('Prefer n8n sources over guessing');
		expect(loaded?.instructions).toContain('knowledge base');
		expect(loaded?.instructions).toContain('n8n-docs-assistant');
		expect(loaded?.instructions).toContain('never load `templates/index.json`');
		expect(loaded?.instructions).toContain('node-types/index.txt');
		expect(loaded?.instructions).toContain('## Trigger URL Sharing');
		expect(loaded?.instructions).toContain('{formBaseUrl}/{path}');
		expect(loaded?.instructions).toContain('**Open chat** button');
		expect(loaded?.instructions).toContain('batch\n`nodes(action="type-definition")`');
		expect(loaded?.instructions).toContain('together with the `load_skill` call');
		expect(loaded?.instructions).toContain('Do not create a plan\njust for verification');
		expect(loaded?.instructions).toContain('never stop before the first\n`build-workflow` call');
		expect(loaded?.instructions).toContain('inspect it first via `debugging-executions`');
		expect(loaded?.instructions).toContain('SDK node `output` mocks are raw `$json` objects');
		expect(loaded?.instructions).toMatch(/inline setup card in the AI\s+Assistant panel/);
		expect(loaded?.instructions).toContain(
			'never ask for\nsetup values before the first successful build',
		);
		expect(loaded?.instructions).toContain('`planning` or call `create-tasks` first');
		expect(loaded?.instructions).toContain('.to(isImportant)');
		expect(loaded?.instructions).toContain('.onTrue(handleImportant)');
		expect(loaded?.instructions).toContain(
			'Do NOT wire branches as standalone statements after `export default`',
		);
		expect(loaded?.instructions).toContain('never reaches the builder');
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
		expect(skill?.description).toContain('Load create-tasks via load_tool before calling it');
		expect(skill?.description).toContain('Do NOT use for new one-off workflows');

		const loaded = await source.loadSkill('planning');
		expect(loaded?.instructions).toContain('## When NOT to use this skill');
		expect(loaded?.instructions).toContain('Consult the knowledge base before planning');
		expect(loaded?.instructions).toContain('never load `templates/index.json` wholesale');
		expect(loaded?.instructions).toContain(
			'Before calling `create-tasks`, load it via `load_tool`',
		);
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

	it('loads the bundled one-off-operations skill', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'one-off-operations');

		expect(skill?.description).toContain('one-off operations');
		expect(skill?.description).toContain('direct-one-off-build-succeeded');

		const loaded = await source.loadSkill('one-off-operations');
		// Normalize whitespace so assertions survive markdown re-wrapping.
		const flattened = loaded?.instructions.replace(/\s+/g, ' ');
		expect(flattened).toContain('executionIntent: "one-off"');
		expect(flattened).toContain('not required and never the completion criterion');
		expect(flattened).toContain('get-node-output');
		expect(flattened).toContain('keep the workflow for future reuse or delete');
	});

	it('loads the bundled post-build-flow skill and trigger input reference', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const skill = source.registry.skills.find((entry) => entry.name === 'post-build-flow');

		expect(skill?.description).toContain('workflow-verification-follow-up');
		expect(skill?.linkedFiles.references).toEqual([
			expect.objectContaining({ path: 'references/trigger-input-data-shapes.md' }),
		]);

		const loaded = await source.loadSkill('post-build-flow');
		expect(loaded?.instructions).toContain('postBuildFlow.required: true');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "ready"');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "needs_setup"');
		expect(loaded?.instructions).toContain('verificationReadiness.status === "not_verifiable"');
		expect(loaded?.instructions).toContain('setupRequirement.status === "required"');
		expect(loaded?.instructions).toContain('inline setup card in the AI Assistant panel');
		expect(loaded?.instructions).toContain(
			'ask once whether the user wants to build an error workflow for that workflow',
		);
		expect(loaded?.instructions).toContain(
			'Do not replace this explicit opt-in with a generic "add\n    anything else?", publish, or test question.',
		);
		expect(loaded?.instructions).toMatch(
			/ask only whether the user wants the live test\. Do not\s+mention publishing or ask about the error workflow/,
		);
		expect(loaded?.instructions).toContain(
			'The error workflow must be published before it can be assigned',
		);
		expect(loaded?.instructions).toContain('Continue the publish-before-assign flow');
		expect(loaded?.instructions).toContain('settings.errorWorkflow');
		expect(loaded?.instructions).toContain(
			'The opt-in must explicitly mention an error workflow and the target workflow\nname.',
		);
		expect(loaded?.instructions).toContain(
			'Mention that n8n has\n   no global or instance-wide error workflow setting only when the user\n   explicitly asked about',
		);
		expect(loaded?.instructions).toContain('Mocked verification live-test follow-up');
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
		expect(loaded?.instructions).toContain(
			'Do not proactively offer, recommend, or mention publishing until a successful',
		);
		expect(loaded?.instructions).toContain(
			'A user-run execution satisfies the publishing gate only',
		);
		expect(loaded?.instructions).toContain(
			'Do not offer publishing as an alternative or describe the workflow as ready to\nuse or publish',
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
		expect(loaded?.instructions).toContain(
			'Before calling `create-tasks`, load it via `load_tool`',
		);
		expect(loaded?.instructions).toContain('load `create-tasks` via `load_tool` if needed');
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

function skillLoadText(output: unknown): string {
	const record = output as { type?: string; value?: Array<{ type: string; text: string }> };
	if (record?.type !== 'content' || !Array.isArray(record.value)) {
		throw new Error(`Expected content-form skill load output, got: ${JSON.stringify(output)}`);
	}
	return record.value.map((part) => part.text).join('\n');
}

async function loadRuntimeSkillSourceWithEnabledModules(enabledModules: string | undefined) {
	vi.resetModules();
	if (enabledModules === undefined) {
		delete process.env.N8N_ENABLED_MODULES;
	} else {
		process.env.N8N_ENABLED_MODULES = enabledModules;
	}

	const { loadInstanceAiRuntimeSkillSource } = await import('../runtime-skills.js');
	return loadInstanceAiRuntimeSkillSource();
}
