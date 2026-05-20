import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
	createRuntimeSkillRegistry,
	createRuntimeSkillSource,
	createRuntimeSkillTools,
	createSkillViewTool,
	createSkillsListTool,
	InvalidRuntimeSkillError,
	loadRuntimeSkillSourceFromDirectory,
	parseRuntimeSkillMarkdown,
	renderSkillCatalogPrompt,
} from '..';
import { Agent } from '../../sdk/agent';

describe('runtime skills', () => {
	it('parses SKILL.md frontmatter into a runtime skill', () => {
		const result = parseRuntimeSkillMarkdown(`---
name: workflow-builder
description: Build workflows.
recommended_tools:
  - bash
allowed_tools: workflow
interface:
  display_name: Workflow Builder
  short_description: Build workflows
  default_prompt: Build an n8n workflow
  icon: workflow
  brand_color: '#ff6d5a'
policy:
  allow_implicit_invocation: true
  product: n8n
dependencies:
  tools:
    - workflow
  secrets:
    - N8N_API_KEY
  mcp_servers:
    - name: browser
      description: Browser automation
      transport: sse
      url: http://localhost:3000/sse
version: '1.0.0'
license: MIT
compatibility: 'n8n >= 1.0.0'
platforms:
  - Daytona
metadata:
  owner: agents
---

Follow the workflow-building process.`);

		expect(result).toEqual({
			ok: true,
			skill: {
				id: 'workflow-builder',
				name: 'workflow-builder',
				description: 'Build workflows.',
				instructions: 'Follow the workflow-building process.',
				recommendedTools: ['bash'],
				allowedTools: ['workflow'],
				interface: {
					displayName: 'Workflow Builder',
					shortDescription: 'Build workflows',
					defaultPrompt: 'Build an n8n workflow',
					icon: 'workflow',
					brandColor: '#ff6d5a',
				},
				policy: {
					allowImplicitInvocation: true,
					product: 'n8n',
				},
				dependencies: {
					tools: ['workflow'],
					secrets: ['N8N_API_KEY'],
					mcpServers: [
						{
							name: 'browser',
							description: 'Browser automation',
							transport: 'sse',
							url: 'http://localhost:3000/sse',
						},
					],
				},
				version: '1.0.0',
				license: 'MIT',
				compatibility: 'n8n >= 1.0.0',
				platforms: ['daytona'],
				metadata: { owner: 'agents' },
			},
		});
	});

	it('rejects invalid SKILL.md frontmatter contract fields', () => {
		const result = parseRuntimeSkillMarkdown(`---
name: Workflow Builder
description: Build workflows.
interface:
  unknown: no
---

Body`);

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('Expected skill validation to fail');
		expect(result.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'invalid_name', field: 'name' }),
				expect.objectContaining({ code: 'unknown_field', field: 'interface.unknown' }),
			]),
		);
	});

	it('creates a deterministic registry independent of input order', () => {
		const skillA = {
			id: 'a',
			name: 'A',
			description: 'First skill',
			instructions: 'A body',
		};
		const skillB = {
			id: 'b',
			name: 'B',
			description: 'Second skill',
			instructions: 'B body',
		};

		const left = createRuntimeSkillRegistry([skillB, skillA]);
		const right = createRuntimeSkillRegistry([skillA, skillB]);

		expect(left).toEqual(right);
		expect(left.skills.map((skill) => skill.id)).toEqual(['a', 'b']);
	});

	it('rejects duplicate skill ids and names', () => {
		expect(() =>
			createRuntimeSkillRegistry([
				{ id: 'dup', name: 'First', description: 'A', instructions: 'A' },
				{ id: 'dup', name: 'Second', description: 'B', instructions: 'B' },
			]),
		).toThrow(InvalidRuntimeSkillError);

		expect(() =>
			createRuntimeSkillRegistry([
				{ id: 'one', name: 'Same', description: 'A', instructions: 'A' },
				{ id: 'two', name: 'same', description: 'B', instructions: 'B' },
			]),
		).toThrow('Duplicate skill name "Same"');
	});

	it('loads filesystem-backed skills and linked files from a directory', async () => {
		const root = mkdtempSync(join(tmpdir(), 'runtime-skills-'));
		try {
			const skillDir = join(root, 'workflows', 'builder');
			mkdirSync(join(skillDir, 'references'), { recursive: true });
			mkdirSync(join(skillDir, 'examples'), { recursive: true });
			writeFileSync(
				join(skillDir, 'SKILL.md'),
				`---
name: workflow-builder
description: Build workflows.
---

Use the workflow SDK.`,
			);
			writeFileSync(join(skillDir, 'references', 'guide.md'), 'Guide text');
			writeFileSync(join(skillDir, 'examples', 'slack.workflow.ts'), 'export default {};');

			const source = loadRuntimeSkillSourceFromDirectory(root);

			expect(source.registry.skills).toHaveLength(1);
			expect(source.registry.skills[0]).toMatchObject({
				id: 'workflow-builder',
				name: 'workflow-builder',
				description: 'Build workflows.',
				directory: skillDir,
				sourceDirectory: 'workflows/builder',
				category: 'workflows',
			});
			expect(source.registry.skills[0].linkedFiles).toMatchObject({
				references: [expect.objectContaining({ path: 'references/guide.md', bytes: 10 })],
				examples: [expect.objectContaining({ path: 'examples/slack.workflow.ts', bytes: 18 })],
				scripts: [],
				templates: [],
				assets: [],
				other: [],
			});
			await expect(
				source.loadFile?.('workflow-builder', 'references/guide.md'),
			).resolves.toMatchObject({
				skillId: 'workflow-builder',
				filePath: 'references/guide.md',
				content: 'Guide text',
				bytes: 10,
			});
			await expect(source.loadFile?.('workflow-builder', '../SKILL.md')).resolves.toBeNull();
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('renders a compact skill catalog without skill bodies', () => {
		const source = createRuntimeSkillSource([
			{
				id: 'summarize_notes',
				name: 'Summarize notes',
				description: 'Use for meeting notes.',
				instructions: 'Extract private decisions.',
			},
		]);

		const prompt = renderSkillCatalogPrompt(source.registry);

		expect(prompt).toContain('Skill loading protocol:');
		expect(prompt).toContain('name: Summarize notes');
		expect(prompt).toContain('id: summarize_notes');
		expect(prompt).not.toContain('Extract private decisions.');
	});

	it('creates skills_list and skill_view tools backed by a runtime skill source', async () => {
		const source = createRuntimeSkillSource([
			{
				id: 'summarize_notes',
				name: 'Summarize notes',
				description: 'Use for meeting notes.',
				instructions: 'Extract decisions.',
			},
		]);
		const listTool = createSkillsListTool(source);
		const viewTool = createSkillViewTool(source);

		await expect(listTool.handler?.({}, {})).resolves.toMatchObject({
			success: true,
			count: 1,
			skills: [expect.objectContaining({ name: 'Summarize notes' })],
		});
		await expect(viewTool.handler?.({ name: 'Summarize notes' }, {})).resolves.toMatchObject({
			success: true,
			name: 'Summarize notes',
			content: 'Extract decisions.',
		});
		await expect(viewTool.handler?.({ name: 'Missing skill' }, {})).resolves.toMatchObject({
			success: false,
		});
	});

	it('uses skill_view for registered linked files when the source supports file loading', async () => {
		const inMemorySource = createRuntimeSkillSource([
			{
				id: 'summarize_notes',
				name: 'Summarize notes',
				description: 'Use for meeting notes.',
				instructions: 'Extract decisions.',
			},
		]);
		const fileBackedSource = {
			...inMemorySource,
			loadFile: async (_skillId: string, filePath: string) =>
				await Promise.resolve({
					skillId: 'summarize_notes',
					filePath,
					content: 'Reference text.',
				}),
		};

		expect(createRuntimeSkillTools(inMemorySource).map((tool) => tool.name)).toEqual([
			'skills_list',
			'skill_view',
		]);
		expect(createRuntimeSkillTools(fileBackedSource).map((tool) => tool.name)).toEqual([
			'skills_list',
			'skill_view',
		]);

		const unsupportedViewTool = createSkillViewTool(inMemorySource);
		await expect(
			unsupportedViewTool.handler?.(
				{ name: 'Summarize notes', filePath: 'references/guide.md' },
				{},
			),
		).resolves.toMatchObject({
			success: false,
			error: 'This skill source does not support loading linked files.',
		});

		const viewTool = createSkillViewTool(fileBackedSource);
		await expect(
			viewTool.handler?.({ name: 'Summarize notes', filePath: 'references/guide.md' }, {}),
		).resolves.toMatchObject({
			success: true,
			filePath: 'references/guide.md',
			content: 'Reference text.',
		});
	});

	it('adds runtime skills to agents through one shared load path', () => {
		const agent = new Agent('assistant')
			.model('anthropic/claude-sonnet-4-5')
			.instructions('Base instructions.')
			.skills([
				{
					id: 'summarize_notes',
					name: 'Summarize notes',
					description: 'Use for meeting notes.',
					instructions: 'Extract decisions.',
				},
			]);

		expect(agent.snapshot.tools.some((tool) => tool.name === 'skills_list')).toBe(true);
		expect(agent.snapshot.tools.some((tool) => tool.name === 'skill_view')).toBe(true);
		expect(agent.snapshot.instructions).toBe('Base instructions.');
	});
});
