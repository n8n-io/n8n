import {
	createRuntimeSkillSource,
	filterRuntimeSkillSource,
	type RuntimeSkillLinkedFileGroup,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { UnexpectedError } from 'n8n-workflow';

export interface SkillVariant {
	id: string;
	changes: ReadonlyArray<{
		skillId: string;
		appendFrom: string;
		useDescription?: boolean;
		/** Use the fragment's instructions, description and recommended tools instead of the original's. Linked files merge. */
		replace?: boolean;
	}>;
	/** Catalog descriptions keyed by skill id. They replace the description only. */
	descriptions?: Readonly<Record<string, string>>;
	disabledSkills?: readonly string[];
	disabledTools?: readonly string[];
}

/** A fragment file wins over an original file with the same path. */
function mergeLinkedFiles(
	original: RuntimeSkillLinkedFiles | undefined,
	fragment: RuntimeSkillLinkedFiles | undefined,
): RuntimeSkillLinkedFiles | undefined {
	if (!original || !fragment) return original ?? fragment;
	const merge = (group: RuntimeSkillLinkedFileGroup) => [
		...fragment[group],
		...original[group].filter(({ path }) => !fragment[group].some((file) => file.path === path)),
	];
	return {
		references: merge('references'),
		templates: merge('templates'),
		scripts: merge('scripts'),
		assets: merge('assets'),
		examples: merge('examples'),
		other: merge('other'),
	};
}

/** Variants may change different skills. Overlapping changes require an explicit combined variant. */
export async function composeSkillVariants(
	source: RuntimeSkillSource,
	variants: readonly SkillVariant[],
	hiddenSkills: readonly string[] = [],
): Promise<{ source: RuntimeSkillSource; disabledTools: string[] }> {
	const changes = new Map<
		string,
		{ variant: SkillVariant; change: SkillVariant['changes'][number] }
	>();
	const descriptions = new Map<string, string>();
	const excluded = new Set(hiddenSkills);
	const disabledTools = new Set<string>();
	const variantIds = new Set<string>();
	for (const variant of variants) {
		if (variantIds.has(variant.id))
			throw new UnexpectedError(`Duplicate skill variant "${variant.id}"`);
		variantIds.add(variant.id);
		for (const id of variant.disabledSkills ?? []) excluded.add(id);
		for (const name of variant.disabledTools ?? []) disabledTools.add(name);
		for (const change of variant.changes) {
			if (changes.has(change.skillId))
				throw new UnexpectedError(`Conflicting variants for skill "${change.skillId}"`);
			changes.set(change.skillId, { variant, change });
			excluded.add(change.appendFrom);
		}
		for (const [id, description] of Object.entries(variant.descriptions ?? {})) {
			if (descriptions.has(id))
				throw new UnexpectedError(`Conflicting descriptions for skill "${id}"`);
			descriptions.set(id, description);
		}
	}
	for (const id of new Set([...changes.keys(), ...descriptions.keys()])) {
		if (excluded.has(id)) throw new UnexpectedError(`Variant changes disabled skill "${id}"`);
		if (!source.registry.skills.some((skill) => skill.id === id)) {
			throw new UnexpectedError(`Unknown variant target skill "${id}"`);
		}
	}

	const skills = await Promise.all(
		source.registry.skills
			.filter(({ id }) => !excluded.has(id))
			.map(async ({ id }) => {
				const original = await source.loadSkill(id);
				if (!original) throw new UnexpectedError(`Runtime skill "${id}" is missing`);
				const selected = changes.get(id);
				const description = descriptions.get(id);
				if (!selected) return description === undefined ? original : { ...original, description };
				const fragment = await source.loadSkill(selected.change.appendFrom);
				if (!fragment)
					throw new UnexpectedError(`Skill fragment "${selected.change.appendFrom}" is missing`);
				const { replace, useDescription } = selected.change;
				return {
					...original,
					version: selected.variant.id,
					description:
						description ??
						(replace || useDescription ? fragment.description : original.description),
					instructions: replace
						? fragment.instructions
						: `${original.instructions}\n\n${fragment.instructions}`,
					...(replace
						? {
								recommendedTools: fragment.recommendedTools,
								linkedFiles: mergeLinkedFiles(original.linkedFiles, fragment.linkedFiles),
							}
						: {}),
					...(fragment.dependencies?.tools?.length
						? {
								dependencies: {
									...original.dependencies,
									tools: [
										...new Set([
											...(original.dependencies?.tools ?? []),
											...fragment.dependencies.tools,
										]),
									],
								},
							}
						: {}),
				};
			}),
	);
	const availableSkills = skills.map((skill) => {
		const disabled = skill.dependencies?.tools?.find((tool) => disabledTools.has(tool));
		if (disabled)
			throw new UnexpectedError(`Skill "${skill.id}" requires disabled tool "${disabled}"`);
		const recommended = skill.recommendedTools?.filter((tool) => !disabledTools.has(tool));
		return recommended?.length !== skill.recommendedTools?.length
			? { ...skill, recommendedTools: recommended }
			: skill;
	});
	const replacedFrom = new Map(
		[...changes].flatMap(
			([id, { change }]): Array<[string, string]> =>
				change.replace ? [[id, change.appendFrom]] : [],
		),
	);
	const { loadFile } = source;
	// A replaced skill serves its fragment's linked files first, then the original's.
	const fragmentFiles =
		loadFile && replacedFrom.size > 0
			? {
					loadFile: async (skillId: string, filePath: string) => {
						const fragmentId = replacedFrom.get(skillId);
						const file = fragmentId ? await loadFile(fragmentId, filePath) : null;
						return file ? { ...file, skillId } : await loadFile(skillId, filePath);
					},
				}
			: {};
	return {
		source: filterRuntimeSkillSource(
			{ ...source, ...createRuntimeSkillSource(availableSkills), ...fragmentFiles },
			[...excluded],
		),
		disabledTools: [...disabledTools].sort(),
	};
}
