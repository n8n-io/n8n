import {
	createRuntimeSkillSource,
	createSkillLoadTool,
	renderSkillCatalogPrompt,
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
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

type SavedSkill = Omit<AssistantSkillContent, 'files'> & {
	files: Array<{ path: string; content: string }>;
};

function content(overrides: Partial<SavedSkill> = {}): SavedSkill {
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

function providerFor(contents: SavedSkill[]) {
	const provider = mock<AssistantSkillProvider>();
	provider.isEnabled.mockResolvedValue(true);
	provider.listSkills.mockResolvedValue(
		contents.map(
			({ instructions: _instructions, frontmatter: _frontmatter, files: _files, ...summary }) =>
				summary,
		),
	);
	provider.readSkill.mockImplementation(async (_context, id) => {
		const saved = contents.find((skill) => skill.id === id);
		return saved ? { ...saved, files: saved.files.map(({ path }) => ({ path })) } : null;
	});
	provider.readFile.mockImplementation(async (_context, skillId, versionId, path) => {
		const saved = contents.find((skill) => skill.id === skillId && skill.versionId === versionId);
		const file = saved?.files.find((file) => file.path === path);
		return file ? { skillId, versionId, ...file } : null;
	});
	return provider;
}

function hubEntries(source: ReturnType<typeof createRuntimeSkillSource>) {
	return source.registry.skills.filter(({ id }) => id !== builtIn.id);
}

describe('Assistant Hub runtime skills', () => {
	it('does not read the Hub when the flag is off', async () => {
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
			expect(skillService.readForAssistant).not.toHaveBeenCalled();
			if (hubEnabled) {
				expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(ASSISTANT_SKILLS_FLAG);
			}
			if (enabled) {
				expect(skillService.listForAssistant).toHaveBeenCalledWith(context);
				await result.source.loadSkill(hubEntries(result.source)[0].id);
				expect(skillService.readForAssistant).toHaveBeenCalledWith(
					context,
					content().id,
					content().versionId,
				);
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
		const result = await loadHubRunSkills(builtIns, provider, context);
		expect(await result.source.loadSkill(builtIn.id)).toMatchObject(builtIn);
		expect(result.source.getLoadError?.('hub-existing')).toMatchObject({ retryable: true });
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
		expect(provider.readSkill).not.toHaveBeenCalled();
		const tool = createSkillLoadTool(source);
		const loaded = await tool.handler?.({ skillId: entry.id }, {});
		expect(loaded).toMatchObject({
			type: 'content',
			value: [{ type: 'text', text: expect.stringContaining(saved.instructions) }],
		});
		expect(provider.readSkill).toHaveBeenCalledWith(context, saved.id, saved.versionId);
		expect(await source.loadSkill(builtIn.id)).toMatchObject(builtIn);
	});

	it('keeps the selected version for instructions and deferred reference reads', async () => {
		const saved = content({
			files: [{ path: 'references/guide.md', content: 'Original reference.' }],
		});
		const provider = providerFor([saved]);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		const [entry] = hubEntries(result.source);
		const [loaded, repeated] = await Promise.all([
			result.source.loadSkill(entry.id),
			result.source.loadSkill(entry.id),
		]);
		provider.readSkill.mockResolvedValue(
			content({ versionId: 'version-2', instructions: 'Later edit.' }),
		);
		expect(repeated).toBe(loaded);
		expect(await result.source.loadSkill(entry.id)).toBe(loaded);
		const reference = await result.source.loadFile?.(entry.id, 'references/guide.md');
		expect(entry.version).toBe('version-1');
		expect(provider.readFile).toHaveBeenCalledWith(
			context,
			saved.id,
			saved.versionId,
			'references/guide.md',
		);
		expect(reference?.content).toBe('Original reference.');
		expect(provider.readSkill).toHaveBeenCalledExactlyOnceWith(context, saved.id, saved.versionId);
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
		'does not put the supplied ID %s into a virtual skill path',
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

	it('reports unsupported files on activation without suppressing a valid namesake', async () => {
		const provider = providerFor([
			content({ id: 'unsupported', files: [{ path: 'scripts/run.py', content: 'print(1)' }] }),
			content(),
		]);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		const [unsupported, valid] = hubEntries(result.source);
		const tool = createSkillLoadTool(result.source);
		expect(await tool.handler?.({ skillId: unsupported.id }, {})).toMatchObject({
			success: false,
			error: expect.stringContaining('Unsupported'),
		});
		expect(await result.source.loadSkill(valid.id)).not.toBeNull();
	});

	it.each(['', '   '])('rejects empty instructions (%j)', async (instructions) => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ instructions })]),
			context,
		);
		const [entry] = hubEntries(result.source);
		expect(await result.source.loadSkill(entry.id)).toBeNull();
		expect(result.source.getLoadError?.(entry.id)?.message).toContain('invalid instructions');
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
			expect(await atLimit.source.loadSkill(hubEntries(atLimit.source)[0].id)).not.toBeNull();
			const tooLarge = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				providerFor([content({ instructions: instructions + 'a' })]),
				context,
			);
			const [entry] = hubEntries(tooLarge.source);
			expect(await tooLarge.source.loadSkill(entry.id)).toBeNull();
			expect(tooLarge.source.getLoadError?.(entry.id)?.message).toContain('UTF-8 bytes');
		}
	});

	it('keeps built-ins usable after a catalog failure', async () => {
		const provider = providerFor([]);
		provider.listSkills.mockRejectedValue(new Error('Unavailable'));
		const builtIns = createRuntimeSkillSource([builtIn]);
		const result = await loadHubRunSkills(builtIns, provider, context);
		expect(await result.source.loadSkill(builtIn.id)).toMatchObject(builtIn);
		expect(result.availabilityNotice).toContain('Hub skills are temporarily unavailable');
		expect(result.source.getLoadError?.('hub-existing')?.retryable).toBe(true);
		expect(result.source.getLoadError?.(builtIn.id)).toBeUndefined();
	});

	it('isolates a content-read failure from other skills', async () => {
		const provider = providerFor([content(), content({ id: 'skill-2' })]);
		provider.readSkill.mockRejectedValueOnce(new Error('Unavailable'));
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		const [failed, valid] = hubEntries(result.source);
		expect(await result.source.loadSkill(failed.id)).toBeNull();
		expect(await result.source.loadSkill(valid.id)).not.toBeNull();
		expect(result.source.getLoadError?.(failed.id)?.message).toContain('could not be loaded');
	});

	it('shares concurrent reads and retries temporary instruction failures', async () => {
		const saved = content();
		const provider = providerFor([saved]);
		provider.readSkill.mockRejectedValueOnce(new Error('Unavailable'));
		const { source } = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			provider,
			context,
		);
		const [entry] = hubEntries(source);
		expect(await Promise.all([source.loadSkill(entry.id), source.loadSkill(entry.id)])).toEqual([
			null,
			null,
		]);
		expect(provider.readSkill).toHaveBeenCalledTimes(1);
		expect(source.getLoadError?.(entry.id)?.retryable).toBe(true);
		expect(await source.loadSkill(entry.id)).toMatchObject({ version: saved.versionId });
		expect(provider.readSkill).toHaveBeenCalledTimes(2);
		expect(provider.readSkill).toHaveBeenLastCalledWith(context, saved.id, saved.versionId);
		expect(source.getLoadError?.(entry.id)).toBeUndefined();
	});

	it('does not activate a skill that becomes unavailable between discovery and reading', async () => {
		const provider = providerFor([content()]);
		provider.readSkill.mockResolvedValue(null);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		expect(await result.source.loadSkill(hubEntries(result.source)[0].id)).toBeNull();
	});

	it.each(['name', 'description'] as const)('excludes skills with an empty %s', async (field) => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ [field]: ' ' })]),
			context,
		);
		expect(hubEntries(result.source)).toHaveLength(0);
	});

	it('loads reference bodies only when requested through load_skill', async () => {
		const referenceBody = 'Detailed reference body that must stay out of activation.';
		const saved = content({
			instructions: 'See [guide](references/guide.md).',
			files: [
				{ path: 'references/guide.md', content: referenceBody },
				{ path: 'references/other.md', content: 'Unrequested reference.' },
			],
		});
		const provider = providerFor([saved, content({ id: 'unselected' })]);
		const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
		const [entry] = hubEntries(result.source);
		expect(result).not.toHaveProperty('prepareWorkspace');
		expect(provider.readSkill).not.toHaveBeenCalled();
		expect(provider.readFile).not.toHaveBeenCalled();
		expect(renderSkillCatalogPrompt(result.source.registry)).not.toContain(saved.instructions);
		expect(result.availabilityNotice).toContain('virtual skill identifiers');
		const tool = createSkillLoadTool(result.source);
		const activation = await tool.handler?.({ skillId: entry.id }, {});
		expect(JSON.stringify(activation)).toContain('references/guide.md');
		expect(JSON.stringify(activation)).not.toContain(referenceBody);
		expect(provider.readFile).not.toHaveBeenCalled();
		const reference = await tool.handler?.(
			{ skillId: entry.id, filePath: 'references/guide.md' },
			{},
		);
		expect(reference).toMatchObject({
			success: true,
			content: referenceBody,
			bytes: Buffer.byteLength(referenceBody),
		});
		expect(provider.readSkill).toHaveBeenCalledExactlyOnceWith(context, saved.id, saved.versionId);
		expect(provider.readFile).toHaveBeenCalledExactlyOnceWith(
			context,
			saved.id,
			saved.versionId,
			'references/guide.md',
		);
	});

	it('reports a reference that becomes unavailable after activation', async () => {
		const saved = content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] });
		const provider = providerFor([saved]);
		const { source } = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			provider,
			context,
		);
		const [entry] = hubEntries(source);
		await source.loadSkill(entry.id);
		await source.loadFile?.(entry.id, 'references/guide.md');
		provider.readFile.mockResolvedValue(null);
		expect(
			await createSkillLoadTool(source).handler?.(
				{ skillId: entry.id, filePath: 'references/guide.md' },
				{},
			),
		).toMatchObject({
			success: false,
			error: expect.stringContaining('unavailable for the selected version'),
		});
	});

	it.each([{ skillId: 'other' }, { versionId: 'other' }, { path: 'references/other.md' }])(
		'rejects a mismatched reference response %j',
		async (override) => {
			const saved = content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] });
			const provider = providerFor([saved]);
			provider.readFile.mockResolvedValue({
				skillId: saved.id,
				versionId: saved.versionId,
				...saved.files[0],
				...override,
			});
			const { source } = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				provider,
				context,
			);
			expect(await source.loadFile?.(hubEntries(source)[0].id, 'references/guide.md')).toBeNull();
		},
	);

	it('handles reference read errors without losing the loaded instructions', async () => {
		const provider = providerFor([
			content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] }),
		]);
		provider.readFile.mockRejectedValue(new Error('Unavailable'));
		const { source } = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			provider,
			context,
		);
		const [entry] = hubEntries(source);
		expect(await source.loadFile?.(entry.id, 'references/guide.md')).toBeNull();
		expect(source.getLoadError?.(entry.id)?.message).toContain('could not be loaded');
		expect(await source.loadSkill(entry.id)).not.toBeNull();
	});

	it.each([
		'references/../other.md',
		'assets/template.md',
		'/references/guide.md',
		'references/guide.txt',
		'references/a\\b.md',
		'references/a\0.md',
	])('rejects unsupported reference path %s', async (path) => {
		const result = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content({ files: [{ path, content: 'Guide.' }] })]),
			context,
		);
		const [entry] = hubEntries(result.source);
		expect(await result.source.loadSkill(entry.id)).toBeNull();
		expect(result.source.getLoadError?.(entry.id)?.message).toContain('Unsupported');
	});

	it('checks the UTF-8 limit for reference files', async () => {
		for (const extra of ['', 'a']) {
			const body = 'é'.repeat(RUNTIME_SKILL_MAX_OUTPUT_BYTES / 2) + extra;
			const result = await loadHubRunSkills(
				createRuntimeSkillSource([builtIn]),
				providerFor([content({ files: [{ path: 'references/guide.markdown', content: body }] })]),
				context,
			);
			const [entry] = hubEntries(result.source);
			expect(await result.source.loadSkill(entry.id)).not.toBeNull();
			const file = await result.source.loadFile?.(entry.id, 'references/guide.markdown');
			if (extra) {
				expect(file).toBeNull();
				expect(result.source.getLoadError?.(entry.id)?.message).toContain('UTF-8 bytes');
			} else expect(file?.bytes).toBe(RUNTIME_SKILL_MAX_OUTPUT_BYTES);
		}
	});

	it('reads only registered paths and preserves built-in reference loading', async () => {
		const builtIns = createRuntimeSkillSource([builtIn]);
		builtIns.loadFile = vi.fn(async () => ({
			skillId: builtIn.id,
			filePath: 'references/builtin.md',
			content: 'Built-in reference.',
		}));
		const result = await loadHubRunSkills(
			builtIns,
			providerFor([content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] })]),
			context,
		);
		const [entry] = hubEntries(result.source);
		await result.source.loadSkill(entry.id);
		for (const path of ['../SKILL.md', 'references/missing.md', '/references/guide.md']) {
			expect(await result.source.loadFile?.(entry.id, path)).toBeNull();
			expect(
				await createSkillLoadTool(result.source).handler?.(
					{ skillId: entry.id, filePath: path },
					{},
				),
			).toMatchObject({ success: false });
		}
		expect(builtIns.loadFile).not.toHaveBeenCalled();
		expect(await result.source.loadFile?.(builtIn.id, 'references/builtin.md')).toMatchObject({
			content: 'Built-in reference.',
		});
	});

	it.each([{ id: 'different-skill' }, { versionId: 'different-version' }])(
		'rejects a mismatched response %j',
		async (override) => {
			const provider = providerFor([content()]);
			provider.readSkill.mockResolvedValue(content(override));
			const result = await loadHubRunSkills(createRuntimeSkillSource([builtIn]), provider, context);
			const [entry] = hubEntries(result.source);
			expect(await result.source.loadSkill(entry.id)).toBeNull();
			expect(result.source.getLoadError?.(entry.id)?.message).toContain(
				'version listed for this turn',
			);
		},
	);

	it('changes the catalog hash for reference-only updates', async () => {
		const first = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([content()]),
			context,
		);
		const second = await loadHubRunSkills(
			createRuntimeSkillSource([builtIn]),
			providerFor([
				content({
					versionId: 'version-2',
					files: [{ path: 'references/guide.md', content: 'New reference.' }],
				}),
			]),
			context,
		);
		expect(second.source.registry.skillsHash).not.toBe(first.source.registry.skillsHash);
	});

	it.each(['available', 'flag-unavailable', 'catalog-unavailable'])(
		'preserves a prepared built-in registry without reading Hub content: %s',
		async (availability) => {
			const builtIns = createRuntimeSkillSource([builtIn]);
			builtIns.prepare = async () => {
				builtIns.registry = {
					...builtIns.registry,
					skillsHash: 'prepared',
					skills: builtIns.registry.skills.map((entry) => ({ ...entry, hash: 'prepared' })),
				};
			};
			const provider = providerFor([content()]);
			if (availability === 'flag-unavailable')
				provider.isEnabled.mockRejectedValue(new Error('Unavailable'));
			if (availability === 'catalog-unavailable')
				provider.listSkills.mockRejectedValue(new Error('Unavailable'));
			const result = await loadHubRunSkills(builtIns, provider, context);
			const previousHash = result.source.registry.skillsHash;
			await result.source.prepare?.();
			expect(result.source.registry.skills[0].hash).toBe('prepared');
			expect(result.source.registry.skillsHash).not.toBe(previousHash);
			expect(hubEntries(result.source)).toHaveLength(availability === 'available' ? 1 : 0);
			expect(provider.readSkill).not.toHaveBeenCalled();
		},
	);
});
