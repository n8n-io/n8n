import {
	createRuntimeSkillSource,
	filterRuntimeSkillSource,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { UnexpectedError } from 'n8n-workflow';

export interface SkillVariant {
	id: string;
	changes: ReadonlyArray<{
		skillId: string;
		appendFrom: string;
		useDescription?: boolean;
	}>;
	disabledSkills?: readonly string[];
	disabledTools?: readonly string[];
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
	}
	for (const id of changes.keys()) {
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
				if (!selected) return original;
				const fragment = await source.loadSkill(selected.change.appendFrom);
				if (!fragment)
					throw new UnexpectedError(`Skill fragment "${selected.change.appendFrom}" is missing`);
				return {
					...original,
					version: selected.variant.id,
					description: selected.change.useDescription ? fragment.description : original.description,
					instructions: `${original.instructions}\n\n${fragment.instructions}`,
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
	return {
		source: filterRuntimeSkillSource({ ...source, ...createRuntimeSkillSource(availableSkills) }, [
			...excluded,
		]),
		disabledTools: [...disabledTools].sort(),
	};
}
