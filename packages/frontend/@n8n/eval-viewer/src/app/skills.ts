/** The skills an attempt loaded, with the references it listed and read, from `load_skill` calls. */
import { z } from 'zod';

import type { TranscriptItem, Turn } from '../schema';

export interface SkillReference {
	path: string;
	bytes: number | null;
	/** Null when the attempt did not load the file. */
	content: string | null;
}

export interface Skill {
	id: string;
	/** The markdown the model got. Null when the run-debug page has no tool result for it. */
	content: string | null;
	references: SkillReference[];
}

/** The model passes the skill as `skillId` or `name`; the result always names it. */
const argsSchema = z.object({
	skillId: z.string().optional(),
	name: z.string().optional(),
	filePath: z.string().optional(),
});

const resultSchema = z.object({
	skillId: z.string().optional(),
	content: z.string().optional(),
	linkedFiles: z
		.object({
			references: z.array(z.object({ path: z.string(), bytes: z.number().optional() })).optional(),
		})
		.optional(),
});

export function skillFileOf(
	item: TranscriptItem,
): { skillId: string; filePath: string | null } | null {
	if (item.kind !== 'tool' || item.tool !== 'load_skill') return null;
	const args = argsSchema.safeParse(item.args);
	const result = resultSchema.safeParse(item.result);
	const skillId =
		(args.success ? (args.data.skillId ?? args.data.name) : undefined) ??
		(result.success ? result.data.skillId : undefined);
	if (!skillId) return null;
	return { skillId, filePath: (args.success ? args.data.filePath : undefined) ?? null };
}

export function skillsOf(turns: Turn[]): Map<string, Skill> {
	const markdownById = new Map(
		turns.flatMap((turn) =>
			turn.steps.flatMap((step) =>
				step.toolCalls.flatMap(
					(call): Array<[string, string]> => (call.skill ? [[call.id, call.skill]] : []),
				),
			),
		),
	);
	const loads = turns.flatMap((turn) =>
		turn.items.flatMap((item) => {
			const file = skillFileOf(item);
			if (!file || item.kind !== 'tool') return [];
			const result = resultSchema.safeParse(item.result);
			return [{ ...file, id: item.id, result: result.success ? result.data : {} }];
		}),
	);
	const ids = [...new Set(loads.map((load) => load.skillId))];
	return new Map(
		ids.map((id): [string, Skill] => {
			const own = loads.filter((load) => load.skillId === id);
			const skillLoads = own.filter((load) => load.filePath === null);
			const fileLoads = own.filter((load) => load.filePath !== null);
			const listed = skillLoads.flatMap((load) => load.result.linkedFiles?.references ?? []);
			const paths = [
				...new Set([
					...listed.map((ref) => ref.path),
					...fileLoads.flatMap((load) => (load.filePath ? [load.filePath] : [])),
				]),
			];
			return [
				id,
				{
					id,
					content: skillLoads.map((load) => markdownById.get(load.id)).find((text) => text) ?? null,
					references: paths.map((path) => ({
						path,
						bytes: listed.find((ref) => ref.path === path)?.bytes ?? null,
						content: fileLoads.find((load) => load.filePath === path)?.result.content ?? null,
					})),
				},
			];
		}),
	);
}

/** The skill and file a `load_skill` call loaded, to open in the skill dialog. */
export function skillTargetOf(
	skills: Map<string, Skill>,
	item: TranscriptItem,
): { skill: Skill; path: string | null } | null {
	const file = skillFileOf(item);
	const skill = file ? skills.get(file.skillId) : undefined;
	return file && skill ? { skill, path: file.filePath } : null;
}
