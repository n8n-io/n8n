import {
	createRuntimeSkillSource,
	createSkillLoadTool,
	renderSkillCatalogPrompt,
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	type Workspace,
	type WorkspaceFilesystem,
} from '@n8n/agents';
import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import type { AssistantSkillContent, AssistantSkillProvider } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AssistantSkillsRollout } from '@/modules/skills/assistant-skills-rollout';
import { HubAssistantSkillProvider } from '@/modules/skills/hub-assistant-skill-provider.service';
import type { SkillService } from '@/modules/skills/skill.service';
import type { SkillsHubRollout } from '@/modules/skills/skills-hub-rollout';
import type { PostHogClient } from '@/posthog';

import { loadHubRunSkills } from '../instance-ai-hub-skills';

const builtIn = {
	id: 'workflow-builder',
	name: 'workflow-builder',
	description: 'Build workflows.',
	instructions: 'Built-in instructions.',
};
const context = { user: mock<User>(), projectId: 'project-1' };

function content(overrides: Partial<AssistantSkillContent> = {}): AssistantSkillContent {
	return {
		id: 'skill-1',
		projectId: null,
		name: 'Review workflows',
		description: 'Review workflow error handling.',
		versionId: 'version-1',
		version: 1,
		instructions: 'Check retries and report missing error handlers.',
		frontmatter: null,
		files: [],
		...overrides,
	};
}

function providerFor(contents: AssistantSkillContent[]) {
	const provider = mock<AssistantSkillProvider>();
	provider.isEnabled.mockResolvedValue(true);
	provider.listSkills.mockResolvedValue(contents);
	provider.readSkill.mockImplementation(
		async (_context, id) => contents.find((skill) => skill.id === id) ?? null,
	);
	return provider;
}

function workspaceWithFiles(initial: Array<[string, string]> = []) {
	const files = new Map(initial);
	const filesystem = mock<WorkspaceFilesystem>();
	filesystem.exists.mockImplementation(async (path) =>
		[...files.keys()].some((file) => file === path || file.startsWith(`${path}/`)),
	);
	filesystem.rmdir.mockImplementation(async (directory) => {
		for (const path of files.keys()) if (path.startsWith(`${directory}/`)) files.delete(path);
	});
	filesystem.writeFile.mockImplementation(async (path, value) => {
		files.set(path, typeof value === 'string' ? value : Buffer.from(value).toString('utf8'));
	});
	filesystem.readFile.mockImplementation(async (path) => {
		const value = files.get(path);
		if (value === undefined) throw new Error('File not found');
		return value;
	});
	return { files, filesystem, workspace: mock<Workspace>({ filesystem }) };
}

function hubEntries(source: ReturnType<typeof createRuntimeSkillSource>) {
	return source.registry.skills.filter(({ id }) => id !== builtIn.id);
}

describe('Assistant Hub runtime skills', () => {
	it('does not read the Hub or prepare files when the flag is off', async () => {
		const builtIns = createRuntimeSkillSource([builtIn]);
		const provider = mock<AssistantSkillProvider>();
		provider.isEnabled.mockResolvedValue(false);
		const result = await loadHubRunSkills(builtIns, provider, context);
		expect(result).toEqual({ source: builtIns });
		expect(provider.listSkills).not.toHaveBeenCalled();
		expect(provider.readSkill).not.toHaveBeenCalled();
	});

	it.each([
		{ hubEnabled: false, flag: true, enabled: false },
		{ hubEnabled: true, flag: false, enabled: false },
		{ hubEnabled: true, flag: undefined, enabled: false },
		{ hubEnabled: true, flag: 'control', enabled: false },
		{ hubEnabled: true, flag: true, enabled: true },
	])(
		'gates runtime skills through PostHog: $hubEnabled / $flag',
		async ({ hubEnabled, flag, enabled }) => {
			const builtIns = createRuntimeSkillSource([builtIn]);
			const postHog = mock<PostHogClient>();
			postHog.getFeatureFlagForInstance.mockResolvedValue(flag);
			const rollout = new AssistantSkillsRollout(
				mock<SkillsHubRollout>({ isEnabled: hubEnabled }),
				postHog,
			);
			const skillService = mock<SkillService>();
			skillService.listForAssistant.mockResolvedValue([content()]);
			skillService.readForAssistant.mockResolvedValue(content());
			const provider = new HubAssistantSkillProvider(rollout, skillService);
			const result = await loadHubRunSkills(builtIns, provider, context);

			expect(hubEntries(result.source)).toHaveLength(enabled ? 1 : 0);
			expect(skillService.listForAssistant).toHaveBeenCalledTimes(enabled ? 1 : 0);
			expect(skillService.readForAssistant).toHaveBeenCalledTimes(enabled ? 1 : 0);
			if (hubEnabled) {
				expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(ASSISTANT_SKILLS_FLAG);
			}
			if (enabled) {
				expect(skillService.listForAssistant).toHaveBeenCalledWith(context);
				expect(skillService.readForAssistant).toHaveBeenCalledWith(context, content().id);
				const { workspace, files } = workspaceWithFiles();
				await result.prepareWorkspace?.(workspace);
				expect(files.size).toBe(1);
				expect(result.availabilityNotice).toBeDefined();
			} else {
				expect(result).toEqual({ source: builtIns });
			}
		},
	);

	it('keeps built-ins available when the rollout check fails', async () => {
		const builtIns = createRuntimeSkillSource([builtIn]);
		const provider = providerFor([content()]);
		provider.isEnabled.mockRejectedValue(new Error('Flag unavailable'));
		expect(await loadHubRunSkills(builtIns, provider, context)).toEqual({ source: builtIns });
		expect(provider.listSkills).not.toHaveBeenCalled();
		expect(provider.readSkill).not.toHaveBeenCalled();
	});

	it('publishes metadata and loads full instructions by stable ID through load_skill', async () => {
		const saved = content();
		const provider = providerFor([saved]);
		const { source } = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			provider,
			context,
		);
		const [entry] = hubEntries(source);
		const catalog = renderSkillCatalogPrompt(source.registry);
		expect(catalog).toContain(saved.description);
		expect(catalog).toContain('Review workflows · Instance');
		expect(catalog).not.toContain(saved.instructions);
		const tool = createSkillLoadTool(source);
		const loaded = await tool.handler?.({ skillId: entry.id }, {});
		expect(loaded).toMatchObject({
			type: 'content',
			value: [{ type: 'text', text: expect.stringContaining(saved.instructions) }],
		});
		expect(provider.readSkill).toHaveBeenCalledWith(context, saved.id);
		expect(await source.loadSkill(builtIn.id)).toMatchObject(builtIn);
	});

	it('uses the same saved version for the catalog, load_skill and workspace', async () => {
		const provider = providerFor([content()]);
		// A save between discovery and reading must not leave version-1 metadata on version-2 content.
		provider.readSkill.mockResolvedValue(
			content({
				versionId: 'version-2',
				version: 2,
				instructions: 'Second version.',
				name: 'New name',
			}),
		);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		const [entry] = hubEntries(result.source);
		provider.readSkill.mockResolvedValue(content({ instructions: 'Later edit.' }));
		const loaded = await result.source.loadSkill(entry.id);
		const { workspace, filesystem } = workspaceWithFiles();
		await result.prepareWorkspace?.(workspace);
		expect(entry.version).toBe('version-2');
		expect(entry.name).toContain('New name');
		expect(loaded?.instructions).toContain('Second version.');
		expect(await filesystem.readFile(entry.path!)).toBe(loaded?.instructions);
		expect(provider.readSkill).toHaveBeenCalledTimes(1);
	});

	it('keeps paths and IDs stable across renames and content versions', async () => {
		const first = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content()]),
			context,
		);
		const second = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([
				content({
					name: '../../workflow-builder',
					versionId: 'new-version',
					instructions: 'New body.',
				}),
			]),
			context,
		);
		const [before] = hubEntries(first.source);
		const [after] = hubEntries(second.source);
		expect(after.id).toBe(before.id);
		expect(after.path).toBe(before.path);
		expect(after.path).toMatch(/^\.n8n\/skills\/hub\/hub-[a-f0-9]{64}\/SKILL\.md$/);
		expect(after.hash).not.toBe(before.hash);
	});

	it.each(['../escape', '/absolute/path', 'a\\b', 'ｅｓｃａｐｅ'])(
		'does not put the supplied ID %s into a workspace path',
		async (id) => {
			const result = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				providerFor([content({ id })]),
				context,
			);
			expect(hubEntries(result.source)[0].path).toMatch(
				/^\.n8n\/skills\/hub\/hub-[a-f0-9]{64}\/SKILL\.md$/,
			);
		},
	);

	it.each([
		['Review workflows', 'review_WORKFLOWS'],
		['Café', 'Cafe\u0301'],
		['Review', 'Ｒｅｖｉｅｗ'],
	])('keeps both cross-scope names: %s and %s', async (instanceName, projectName) => {
		const instance = content({ name: instanceName, instructions: 'Instance rules.' });
		const project = content({
			id: 'skill-2',
			name: projectName,
			projectId: 'project-1',
			instructions: 'Project rules.',
		});
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([instance, project]),
			context,
		);
		const entries = hubEntries(result.source);
		expect(entries).toHaveLength(2);
		expect(entries.map(({ name }) => name)).toEqual(
			expect.arrayContaining([`${instanceName} · Instance`, `${projectName} · Current project`]),
		);
		for (const entry of entries) {
			const expected = entry.metadata?.hubSkillId === instance.id ? instance : project;
			expect((await result.source.loadSkill(entry.id))?.instructions).toContain(
				expected.instructions,
			);
		}
		const load = createSkillLoadTool(result.source);
		expect(await load.handler?.({ name: instanceName }, {})).toMatchObject({ success: false });
	});

	it('disambiguates Unicode-equivalent names within a scope by ID', async () => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ name: 'Café' }), content({ id: 'skill-2', name: 'Cafe\u0301' })]),
			context,
		);
		const entries = hubEntries(result.source);
		expect(entries).toHaveLength(2);
		for (const entry of entries) expect(entry.name).toContain(entry.id);
	});

	it('cannot replace a built-in with the same ID or name', async () => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ id: builtIn.id, name: builtIn.name })]),
			context,
		);
		expect(await result.source.loadSkill(builtIn.id)).toMatchObject(builtIn);
		expect(hubEntries(result.source)).toHaveLength(1);
	});

	it('rejects attachments explicitly without suppressing a valid skill with the same name', async () => {
		const valid = content();
		const unsupported = content({
			id: 'skill-2',
			files: [{ path: 'references/guide.md', content: 'Required guide.' }],
		});
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([unsupported, valid]),
			context,
		);
		expect(hubEntries(result.source)).toHaveLength(1);
		expect(hubEntries(result.source)[0].name).toBe('Review workflows · Instance');
		expect(result.availabilityNotice).toContain('unsupported attachments');
		expect(result.availabilityNotice).toContain(unsupported.id);
		expect(result.availabilityNotice).not.toContain('"skillId":"skill-1"');
		const { workspace, files } = workspaceWithFiles();
		await result.prepareWorkspace?.(workspace);
		expect([...files.keys()]).toHaveLength(1);
		expect([...files.values()][0]).not.toContain('Required guide.');
	});

	it.each(['', '   '])('rejects empty instructions (%j)', async (instructions) => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ instructions })]),
			context,
		);
		expect(hubEntries(result.source)).toHaveLength(0);
		expect(result.availabilityNotice).toContain('invalid skill content');
	});

	it('applies the same UTF-8 byte limit to ASCII and non-ASCII content', async () => {
		const probe = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ instructions: 'a' })]),
			context,
		);
		const loaded = await probe.source.loadSkill(hubEntries(probe.source)[0].id);
		const overhead = Buffer.byteLength(loaded!.instructions, 'utf8') - 1;
		const capacity = RUNTIME_SKILL_MAX_OUTPUT_BYTES - overhead;
		for (const character of ['a', 'é', '界']) {
			const size = Buffer.byteLength(character, 'utf8');
			const instructions =
				character.repeat(Math.floor(capacity / size)) + 'a'.repeat(capacity % size);
			const atLimit = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				providerFor([content({ instructions })]),
				context,
			);
			expect(hubEntries(atLimit.source)).toHaveLength(1);
			const tooLarge = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				providerFor([content({ instructions: instructions + 'a' })]),
				context,
			);
			expect(hubEntries(tooLarge.source)).toHaveLength(0);
			expect(tooLarge.availabilityNotice).toContain('UTF-8 bytes');
		}
	});

	it('keeps built-ins usable after a catalog failure and clears earlier Hub files before workspace use', async () => {
		const provider = providerFor([]);
		provider.listSkills.mockRejectedValue(new Error('Unavailable'));
		const builtIns = createRuntimeSkillSource([builtIn]);
		const result = await loadHubRunSkills(builtIns, provider, context);
		expect(await result.source.loadSkill(builtIn.id)).toMatchObject(builtIn);
		expect(result.availabilityNotice).toContain('Hub skills are unavailable for this turn');
		const { workspace, files } = workspaceWithFiles([
			['.n8n/skills/hub/old/SKILL.md', 'Old Hub body'],
			['workflows/example.ts', 'User workflow'],
			['.n8n/skills/built-in/SKILL.md', 'Built-in body'],
		]);
		await result.prepareWorkspace?.(workspace);
		expect(files.has('.n8n/skills/hub/old/SKILL.md')).toBe(false);
		expect(files.size).toBe(2);
	});

	it('isolates a content-read failure from other skills', async () => {
		const provider = providerFor([content(), content({ id: 'skill-2' })]);
		provider.readSkill.mockRejectedValueOnce(new Error('Unavailable'));
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		expect(hubEntries(result.source)).toHaveLength(1);
		expect(hubEntries(result.source)[0].metadata?.hubSkillId).toBe('skill-2');
		expect(result.availabilityNotice).toContain('could not be read');
	});

	it('does not publish a skill that becomes unavailable between discovery and reading', async () => {
		const provider = providerFor([content()]);
		provider.readSkill.mockResolvedValue(null);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		expect(hubEntries(result.source)).toHaveLength(0);
	});

	it.each(['name', 'description'] as const)('excludes skills with an empty %s', async (field) => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ [field]: ' ' })]),
			context,
		);
		expect(hubEntries(result.source)).toHaveLength(0);
		expect(result.availabilityNotice).toContain('invalid skill content');
	});

	it('does not remove a missing directory on first workspace use', async () => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content()]),
			context,
		);
		const { workspace, filesystem, files } = workspaceWithFiles();
		await result.prepareWorkspace?.(workspace);
		expect(filesystem.rmdir).not.toHaveBeenCalled();
		expect(files.size).toBe(1);
	});

	it('fails workspace preparation if current content cannot be written', async () => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content()]),
			context,
		);
		const { workspace, filesystem } = workspaceWithFiles();
		filesystem.writeFile.mockRejectedValue(new Error('Write failed'));
		await expect(result.prepareWorkspace?.(workspace)).rejects.toThrow('Write failed');
	});
});
