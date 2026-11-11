import { diffText, type DiffCount, type DiffLine } from '@n8n/utils/diff-text';
import type { AgentSkill } from '../../types';

export type { DiffCount, DiffSegment, DiffLine } from '@n8n/utils/diff-text';
export { diffLines, diffWords } from '@n8n/utils/diff-text';

/** A reference file that only one version has. */
export type FileStatus = 'added' | 'removed';
export type FileChange = DiffCount & { status?: FileStatus };

/** One field of SKILL.md, or one reference file, as two versions have it. */
export type DiffSection = DiffCount & {
	/** `name`, `description`, `instructions`, or the path of a reference file. */
	key: string;
	lines: DiffLine[];
	/** Set for a reference file that only one version has. */
	status?: FileStatus;
};

/** The SKILL.md file, as the editor names it in the file list. */
export const SKILL_FILE = 'SKILL.md';

function section(key: string, from: string, to: string): DiffSection {
	return { key, ...diffText(from, to) };
}

/** The fields of SKILL.md and every reference file that either version has. */
export function diffSkills(from: AgentSkill, to: AgentSkill): DiffSection[] {
	const fromFiles = new Map((from.references ?? []).map((file) => [file.path, file.content]));
	const toFiles = new Map((to.references ?? []).map((file) => [file.path, file.content]));
	const paths = [...new Set([...fromFiles.keys(), ...toFiles.keys()])].sort();
	return [
		section('name', from.name, to.name),
		section('description', from.description, to.description),
		section('instructions', from.instructions, to.instructions),
		...paths.map((path) => ({
			...section(path, fromFiles.get(path) ?? '', toFiles.get(path) ?? ''),
			...fileStatus(fromFiles.has(path), toFiles.has(path)),
		})),
	];
}

function fileStatus(inFrom: boolean, inTo: boolean): { status?: FileStatus } {
	if (!inFrom) return { status: 'added' };
	if (!inTo) return { status: 'removed' };
	return {};
}

/** Lines added and removed in each file, keyed by path, for the file list. */
export function countsByFile(sections: DiffSection[]): Record<string, FileChange> {
	const counts: Record<string, FileChange> = { [SKILL_FILE]: { added: 0, removed: 0 } };
	for (const { key, added, removed, status } of sections) {
		const path =
			key === 'name' || key === 'description' || key === 'instructions' ? SKILL_FILE : key;
		const count = counts[path] ?? { added: 0, removed: 0 };
		counts[path] = {
			added: count.added + added,
			removed: count.removed + removed,
			...(status ? { status } : {}),
		};
	}
	return counts;
}
