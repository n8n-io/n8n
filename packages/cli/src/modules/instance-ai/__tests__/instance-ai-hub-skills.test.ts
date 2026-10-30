import {
	createRuntimeSkillSource,
	createSkillLoadTool,
	renderSkillCatalogPrompt,
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
} from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { loadHubRunSkills, type AssistantSkillReader } from '../instance-ai-hub-skills';
import { InstanceAiSkillTelemetry } from '../instance-ai-skill-telemetry';
import type { AssistantSkillContent } from '@/modules/skills';

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
	const provider = mock<AssistantSkillReader>();
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

async function load(
	provider = providerFor([content()]),
	builtIns = createRuntimeSkillSource([builtIn]),
) {
	return await loadHubRunSkills(builtIns, provider, context);
}

describe('Assistant Hub runtime skills', () => {
	it.each(['off', 'unavailable'])('does not expose the Hub when the flag is %s', async (flag) => {
		const builtIns = createRuntimeSkillSource([builtIn]);
		const provider = providerFor([content()]);
		if (flag === 'unavailable') provider.isEnabled.mockRejectedValue(new Error('Unavailable'));
		else provider.isEnabled.mockResolvedValue(false);
		const { source, availabilityNotice } = await load(provider, builtIns);
		expect(source.registry).toEqual(builtIns.registry);
		expect(source.shouldAppendSkillUpdates?.('hub-previously-loaded')).toBe(true);
		expect(source.shouldAppendSkillUpdates?.(builtIn.id)).toBe(false);
		expect(await source.loadSkill('hub-previously-loaded')).toBeNull();
		if (flag === 'unavailable') {
			expect(availabilityNotice).toContain('temporarily unavailable');
			expect(source.getLoadError?.('hub-previously-loaded')?.retryable).toBe(true);
		} else {
			expect(availabilityNotice).toBeUndefined();
			expect(source.getLoadError?.('hub-previously-loaded')).toBeUndefined();
		}
		expect(provider.listSkills).not.toHaveBeenCalled();
		expect(provider.readSkill).not.toHaveBeenCalled();
	});

	it('discovers summaries, activates one skill, and reads references on demand', async () => {
		const saved = content({
			files: [
				{ path: 'references/guide.md', content: 'Detailed guide.' },
				{ path: 'references/other.md', content: 'Unrequested reference.' },
			],
		});
		const provider = providerFor([saved, content({ id: 'unselected' })]);
		const { source, mapSkillEventForDisplay } = await load(provider);
		const [entry] = hubEntries(source);
		const catalog = renderSkillCatalogPrompt(source.registry);
		expect(catalog).toContain(saved.description);
		expect(catalog).not.toContain(saved.instructions);
		expect(provider.readSkill).not.toHaveBeenCalled();

		const tool = createSkillLoadTool(source);
		const call: InstanceAiEvent = {
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'assistant',
			payload: { toolCallId: 'load-1', toolName: 'load_skill', args: { skillId: entry.id } },
		};
		expect(mapSkillEventForDisplay?.(call)).toBe(call);
		const activation = await tool.handler?.({ skillId: entry.id }, { loadSkill: source.loadSkill });
		const event: InstanceAiEvent = {
			type: 'tool-result',
			runId: call.runId,
			agentId: call.agentId,
			payload: { toolCallId: 'load-1', result: activation },
		};
		const originalEvent = structuredClone(event);
		expect(mapSkillEventForDisplay?.(event)).toMatchObject({
			payload: { result: { content: expect.stringContaining(saved.instructions) } },
		});
		expect(activation).toMatchObject({
			success: true,
			content: expect.stringContaining(saved.instructions),
			linkedFiles: { references: saved.files.map(({ path }) => ({ path })) },
		});
		expect(event).toEqual(originalEvent);
		expect(JSON.stringify(activation)).not.toContain('Detailed guide.');
		expect(provider.readFile).not.toHaveBeenCalled();
		expect(
			await tool.handler?.({ skillId: entry.id, filePath: 'references/guide.md' }, {}),
		).toMatchObject({ success: true, content: 'Detailed guide.' });
		expect(provider.readSkill).toHaveBeenCalledExactlyOnceWith(context, saved.id, saved.versionId);
		expect(provider.readFile).toHaveBeenCalledExactlyOnceWith(
			context,
			saved.id,
			saved.versionId,
			'references/guide.md',
		);
		expect(await source.loadSkill(builtIn.id)).toMatchObject(builtIn);
	});

	it.each([
		'built-in',
		'unloaded',
		'version mismatch',
		'reference',
		'failed',
		'other tool',
		'other agent',
	])('preserves %s results in the display stream', async (scenario) => {
		const provider = providerFor([content()]);
		const { source, mapSkillEventForDisplay } = await load(provider);
		const [entry] = hubEntries(source);
		if (scenario !== 'unloaded') await source.loadSkill(entry.id);
		mapSkillEventForDisplay?.({
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'assistant',
			payload: {
				toolCallId: 'load-1',
				toolName: scenario === 'other tool' ? 'skills' : 'load_skill',
				args: { skillId: entry.id },
			},
		});
		const event: InstanceAiEvent = {
			type: 'tool-result',
			runId: 'run-1',
			agentId: scenario === 'other agent' ? 'custom-agent' : 'assistant',
			payload: {
				toolCallId: 'load-1',
				result: {
					success: scenario !== 'failed',
					skillId: scenario === 'built-in' ? builtIn.id : entry.id,
					hash: scenario === 'version mismatch' ? 'other-version' : entry.hash,
					content: 'Original output.',
					...(scenario === 'reference' ? { filePath: 'references/guide.md' } : {}),
				},
			},
		};
		expect(mapSkillEventForDisplay?.(event)).toBe(event);
		expect(provider.readSkill).toHaveBeenCalledTimes(scenario === 'unloaded' ? 0 : 1);
	});

	it('retains the selected version for instructions and references throughout the turn', async () => {
		const saved = content({ files: [{ path: 'references/guide.md', content: 'Original guide.' }] });
		const provider = providerFor([saved]);
		const { source } = await load(provider);
		const [entry] = hubEntries(source);
		const loaded = await source.loadSkill(entry.id);
		provider.readSkill.mockResolvedValue(
			content({ versionId: 'version-2', instructions: 'Later edit.' }),
		);
		expect(await source.loadSkill(entry.id)).toBe(loaded);
		expect(await source.loadFile?.(entry.id, 'references/guide.md')).toMatchObject({
			content: 'Original guide.',
		});
		expect(provider.readSkill).toHaveBeenCalledExactlyOnceWith(context, saved.id, saved.versionId);
		expect(provider.readFile).toHaveBeenCalledWith(
			context,
			saved.id,
			saved.versionId,
			'references/guide.md',
		);
	});

	it('keeps IDs and virtual paths stable while catalog versions change', async () => {
		const first = await load();
		const second = await load(
			providerFor([content({ name: '../../renamed', versionId: 'version-2' })]),
		);
		const [before] = hubEntries(first.source);
		const [after] = hubEntries(second.source);
		expect(after.id).toBe(before.id);
		expect(after.path).toBe(before.path);
		expect(after.path).toMatch(/^\.n8n\/skills\/hub\/hub-[a-f0-9]{64}\/SKILL\.md$/);
		expect(second.source.registry.skillsHash).not.toBe(first.source.registry.skillsHash);
	});

	it('keeps matching names in both scopes and preserves built-ins', async () => {
		const instance = content({ id: builtIn.id, name: builtIn.name });
		const project = content({ id: 'skill-2', name: builtIn.name, projectId: 'project-1' });
		const provider = providerFor([instance, project]);
		const { source } = await load(provider);
		const entries = hubEntries(source);
		expect(entries.map(({ name }) => name)).toEqual([
			`${builtIn.name} · Instance`,
			`${builtIn.name} · Current project`,
		]);
		for (const entry of entries) {
			await source.loadSkill(entry.id);
			expect(provider.readSkill).toHaveBeenLastCalledWith(
				context,
				entry.metadata?.hubSkillId,
				'version-1',
			);
		}
		expect(await source.loadSkill(builtIn.id)).toMatchObject(builtIn);
	});

	it('disambiguates equivalent names within one scope by ID', async () => {
		const { source } = await load(
			providerFor([content({ name: 'Café' }), content({ id: 'skill-2', name: 'Cafe\u0301' })]),
		);
		const entries = hubEntries(source);
		expect(entries).toHaveLength(2);
		for (const entry of entries) expect(entry.name).toContain(entry.id);
	});

	it.each([
		['empty instructions', { instructions: ' ' }],
		['oversized instructions', { instructions: 'é'.repeat(RUNTIME_SKILL_MAX_OUTPUT_BYTES / 2) }],
		['unsupported file', { files: [{ path: 'scripts/run.py', content: 'print(1)' }] }],
		['invalid path', { files: [{ path: 'references/a\0.md', content: 'Guide.' }] }],
	] satisfies Array<[string, Partial<SavedSkill>]>)(
		'rejects %s on activation',
		async (_reason, override) => {
			const { source } = await load(providerFor([content(override), content({ id: 'valid' })]));
			const [invalid, valid] = hubEntries(source);
			expect(
				await createSkillLoadTool(source).handler?.({ skillId: invalid.id }, {}),
			).toMatchObject({ success: false, error: expect.any(String) });
			expect(source.getLoadError?.(invalid.id)?.retryable).toBe(false);
			expect(await source.loadSkill(valid.id)).not.toBeNull();
		},
	);

	it('coalesces concurrent reads and retries temporary instruction failures', async () => {
		const provider = providerFor([content(), content({ id: 'other' })]);
		provider.readSkill.mockRejectedValueOnce(new Error('Unavailable'));
		const { source } = await load(provider);
		const [entry, other] = hubEntries(source);
		expect(await Promise.all([source.loadSkill(entry.id), source.loadSkill(entry.id)])).toEqual([
			null,
			null,
		]);
		expect(provider.readSkill).toHaveBeenCalledTimes(1);
		expect(source.getLoadError?.(entry.id)?.retryable).toBe(true);
		expect(await source.loadSkill(other.id)).not.toBeNull();
		expect(await source.loadSkill(entry.id)).not.toBeNull();
		expect(provider.readSkill).toHaveBeenCalledTimes(3);
		expect(source.getLoadError?.(entry.id)).toBeUndefined();
	});

	it.each([null, content({ id: 'other' }), content({ versionId: 'other' })])(
		'rejects unavailable or mismatched skill content: %j',
		async (response) => {
			const provider = providerFor([content()]);
			provider.readSkill.mockResolvedValue(response);
			const { source } = await load(provider);
			const [entry] = hubEntries(source);
			expect(await source.loadSkill(entry.id)).toBeNull();
			expect(source.getLoadError?.(entry.id)?.retryable).toBe(false);
		},
	);

	it.each([null, { skillId: 'other' }, { versionId: 'other' }, { path: 'references/other.md' }])(
		'rejects unavailable or mismatched reference content: %j',
		async (override) => {
			const saved = content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] });
			const provider = providerFor([saved]);
			const { source } = await load(provider);
			const [entry] = hubEntries(source);
			await source.loadFile?.(entry.id, 'references/guide.md');
			provider.readFile.mockResolvedValue(
				override && {
					skillId: saved.id,
					versionId: saved.versionId,
					...saved.files[0],
					...override,
				},
			);
			expect(
				await createSkillLoadTool(source).handler?.(
					{
						skillId: entry.id,
						filePath: 'references/guide.md',
					},
					{},
				),
			).toMatchObject({
				success: false,
				error: expect.stringContaining('unavailable for the selected version'),
			});
		},
	);

	it('rejects saved reference paths after access is revoked and the turn source is rebuilt', async () => {
		const filePath = 'references/guide.md';
		const saved = content({ files: [{ path: filePath, content: 'Guide.' }] });
		const provider = providerFor([saved]);
		const { source } = await load(provider);
		const [entry] = hubEntries(source);
		const tool = createSkillLoadTool(source);
		await tool.handler?.({ skillId: entry.id }, {});
		const referenceInput = { skillId: entry.id, filePath };
		expect(await tool.handler?.(referenceInput, {})).toMatchObject({
			success: true,
			content: 'Guide.',
		});

		provider.readFile.mockResolvedValue(null);
		provider.readSkill.mockResolvedValue(null);
		provider.listSkills.mockResolvedValue([]);
		expect(await tool.handler?.(referenceInput, {})).toMatchObject({ success: false });
		expect(provider.readFile).toHaveBeenCalledTimes(2);

		// Each resumed turn builds a new source, including after history compaction.
		const next = await load(provider);
		const nextTool = createSkillLoadTool(next.source);
		for (const oldPath of [filePath, `${entry.directory}/${filePath}`, entry.path]) {
			expect(await nextTool.handler?.({ skillId: entry.id, filePath: oldPath }, {})).toMatchObject({
				success: false,
				error: expect.stringContaining('Unknown skill'),
			});
		}
		expect(await next.source.loadFile?.(entry.id, filePath)).toBeNull();
		expect(provider.readFile).toHaveBeenCalledTimes(2);
		expect(provider.readSkill).toHaveBeenCalledTimes(1);
	});

	it('retries reference failures without discarding loaded instructions', async () => {
		const provider = providerFor([
			content({ files: [{ path: 'references/guide.md', content: 'Guide.' }] }),
		]);
		provider.readFile.mockRejectedValueOnce(new Error('Unavailable'));
		const { source } = await load(provider);
		const [entry] = hubEntries(source);
		expect(await source.loadFile?.(entry.id, 'references/guide.md')).toBeNull();
		expect(source.getLoadError?.(entry.id)?.retryable).toBe(true);
		expect(await source.loadSkill(entry.id)).not.toBeNull();
		expect(await source.loadFile?.(entry.id, 'references/guide.md')).toMatchObject({
			content: 'Guide.',
		});
		expect(source.getLoadError?.(entry.id)).toBeUndefined();
	});

	it.each([0, 1])('enforces the reference UTF-8 limit with %i extra bytes', async (extra) => {
		const body = 'é'.repeat(RUNTIME_SKILL_MAX_OUTPUT_BYTES / 2) + 'a'.repeat(extra);
		const { source } = await load(
			providerFor([content({ files: [{ path: 'references/guide.md', content: body }] })]),
		);
		const file = await source.loadFile?.(hubEntries(source)[0].id, 'references/guide.md');
		if (extra) expect(file).toBeNull();
		else expect(file?.bytes).toBe(RUNTIME_SKILL_MAX_OUTPUT_BYTES);
	});

	it('reads only registered Hub paths and delegates built-in references', async () => {
		const builtIns = createRuntimeSkillSource([builtIn]);
		builtIns.loadFile = vi.fn(async () => ({
			skillId: builtIn.id,
			filePath: 'references/builtin.md',
			content: 'Built-in reference.',
		}));
		const provider = providerFor([content()]);
		const { source } = await load(provider, builtIns);
		const [entry] = hubEntries(source);
		expect(await source.loadFile?.(entry.id, 'references/missing.md')).toBeNull();
		expect(provider.readFile).not.toHaveBeenCalled();
		expect(builtIns.loadFile).not.toHaveBeenCalled();
		expect(await source.loadFile?.(builtIn.id, 'references/builtin.md')).toMatchObject({
			content: 'Built-in reference.',
		});
	});

	it.each(['available', 'catalog-unavailable'])(
		'preserves built-in preparation when the Hub is %s',
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
			if (availability === 'catalog-unavailable')
				provider.listSkills.mockRejectedValue(new Error('Unavailable'));
			const { source, availabilityNotice } = await load(provider, builtIns);
			const previousHash = source.registry.skillsHash;
			await source.prepare?.();
			expect(source.registry.skills[0].hash).toBe('prepared');
			expect(source.registry.skillsHash).not.toBe(previousHash);
			expect(await source.loadSkill(builtIn.id)).toMatchObject(builtIn);
			expect(hubEntries(source)).toHaveLength(availability === 'available' ? 1 : 0);
			expect(provider.readSkill).not.toHaveBeenCalled();
			if (availability !== 'available') {
				expect(availabilityNotice).toContain('temporarily unavailable');
				expect(source.getLoadError?.('hub-existing')?.retryable).toBe(true);
				expect(source.getLoadError?.(builtIn.id)).toBeUndefined();
			}
		},
	);
});

describe('Hub load telemetry outcomes', () => {
	it('keeps concurrent reference failures separate', async () => {
		const provider = providerFor([
			content({
				files: [
					{ path: 'references/temporary.md', content: 'Temporary' },
					{ path: 'references/missing.md', content: 'Missing' },
				],
			}),
		]);
		const { source } = await load(provider);
		const [entry] = hubEntries(source);
		const tool = createSkillLoadTool(source);
		await tool.handler?.({ skillId: entry.id }, {});
		provider.readFile.mockImplementation(async (_context, _id, _version, path) => {
			if (path === 'references/temporary.md') throw new Error('Temporary error');
			return null;
		});
		const results = await Promise.all([
			tool.handler?.({ skillId: entry.id, filePath: 'references/temporary.md' }, {}),
			tool.handler?.({ skillId: entry.id, filePath: 'references/missing.md' }, {}),
		]);
		expect(results).toMatchObject([
			{ success: false, errorCode: 'temporarily_unavailable' },
			{ success: false, errorCode: 'unavailable' },
		]);
	});

	it('reports a temporary catalog failure for a previously known Hub ID', async () => {
		const provider = providerFor([content()]);
		const first = await load(provider);
		const [entry] = hubEntries(first.source);
		provider.listSkills.mockRejectedValue(new Error('Temporary catalog error'));
		const next = await load(provider);
		const tool = createSkillLoadTool(next.source);
		expect(await tool.handler?.({ skillId: entry.id }, {})).toMatchObject({
			success: false,
			errorCode: 'temporarily_unavailable',
		});
	});

	it('uses each tool result reason after a transient reference error', async () => {
		const saved = content({ files: [{ path: 'references/guide.md', content: 'Guide' }] });
		const provider = providerFor([saved]);
		const { source } = await load(provider);
		const [entry] = hubEntries(source);
		const tool = createSkillLoadTool(source);
		const telemetry = new InstanceAiSkillTelemetry('orchestrator-1');
		telemetry.bind(source);
		async function invoke(key: string, filePath?: string) {
			const args = { skillId: entry.id, ...(filePath ? { filePath } : {}) };
			telemetry.observe({
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'orchestrator-1',
				payload: { toolCallId: key, toolName: 'load_skill', args },
			});
			const result = await tool.handler?.(args, { loadSkill: source.loadSkill });
			telemetry.observe({
				type: 'tool-result',
				runId: 'run-1',
				agentId: 'orchestrator-1',
				payload: { toolCallId: key, result },
			});
		}
		await invoke('main');
		provider.readFile.mockRejectedValue(new Error('Private provider error'));
		await invoke('transient', 'references/guide.md');
		await invoke('invalid', 'references/not-registered.md');
		expect(telemetry.snapshot()).toMatchObject({
			hub_skill_attempt_count: 1,
			hub_skill_load_count: 1,
			hub_skill_loaded_ids: [saved.id],
			hub_skill_reference_failure_count: 2,
			hub_skill_failures: [
				{ operation: 'reference', reason: 'temporarily_unavailable', count: 1 },
				{ operation: 'reference', reason: 'invalid_reference', count: 1 },
			],
		});
	});
});
