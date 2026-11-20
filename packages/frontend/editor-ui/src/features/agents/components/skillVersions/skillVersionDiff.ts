import { diffText, type DiffCount, type DiffLine } from '@n8n/utils/diff-text';
import type { AgentSkill } from '@/features/agents/types';

export type { DiffCount, DiffLine } from '@n8n/utils/diff-text';

/** File changes that can have no line counts. */
export type FileStatus = 'added' | 'removed' | 'modified';
export type FileChange = DiffCount & { status?: FileStatus };

/** One field of SKILL.md, or one reference file, as two versions have it. */
export type DiffSection = DiffCount & {
	/** `name`, `description`, `instructions`, or the path of a reference file. */
	key: string;
	lines: DiffLine[];
	isFile?: true;
	isBinary?: boolean;
	status?: FileStatus;
};

/** The SKILL.md file, as the editor names it in the file list. */
export const SKILL_FILE = 'SKILL.md';

function section(key: string, from: string, to: string): DiffSection {
	return { key, ...diffText(from, to) };
}

/** The fields of SKILL.md and every reference file that either version has. */
export function diffSkills(from: AgentSkill, to: AgentSkill): DiffSection[] {
	const fromFiles = new Map((from.references ?? []).map((file) => [file.path, file]));
	const toFiles = new Map((to.references ?? []).map((file) => [file.path, file]));
	const paths = [...new Set([...fromFiles.keys(), ...toFiles.keys()])].sort();
	return [
		section('name', from.name, to.name),
		section('description', from.description, to.description),
		section('instructions', from.instructions, to.instructions),
		...paths.map((path): DiffSection => {
			const before = fromFiles.get(path);
			const after = toFiles.get(path);
			const isBinary = before?.isBinary || after?.isBinary;
			const status = !before
				? 'added'
				: !after
					? 'removed'
					: isBinary && (before.isBinary !== after.isBinary || before.content !== after.content)
						? 'modified'
						: undefined;
			return {
				...section(
					path,
					before?.isBinary ? '' : (before?.content ?? ''),
					after?.isBinary ? '' : (after?.content ?? ''),
				),
				...(status ? { status } : {}),
				...(isBinary ? { isBinary } : {}),
				isFile: true,
			};
		}),
	];
}

/** Lines added and removed in each file, keyed by path, for the file list. */
export function countsByFile(sections: DiffSection[]): Record<string, FileChange> {
	const counts = new Map<string, FileChange>([[SKILL_FILE, { added: 0, removed: 0 }]]);
	for (const { key, added, removed, status, isFile } of sections) {
		const path = isFile ? key : SKILL_FILE;
		const count = counts.get(path) ?? { added: 0, removed: 0 };
		counts.set(path, {
			added: count.added + added,
			removed: count.removed + removed,
			...(status ? { status } : {}),
		});
	}
	return Object.fromEntries(counts);
}
