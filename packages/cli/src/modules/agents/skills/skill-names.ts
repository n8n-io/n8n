import { skillNameKey } from '@n8n/api-types';

/**
 * Names in `added` that clash with a name in `existing` or with an earlier added name.
 * Clashes among `existing` alone are allowed: agents keep the names they already had.
 */
export function findIntroducedNameClashes(existing: string[], added: string[]): string[] {
	const taken = new Set(existing.map(skillNameKey));
	const clashes: string[] = [];
	for (const name of added) {
		const key = skillNameKey(name);
		if (taken.has(key)) clashes.push(name);
		taken.add(key);
	}
	return clashes;
}

/** Whether renaming one skill of an agent makes it clash with the agent's other skills. */
export function renameIntroducesClash(
	otherNames: string[],
	oldName: string,
	newName: string,
): boolean {
	const newKey = skillNameKey(newName);
	if (newKey === skillNameKey(oldName)) return false;
	return otherNames.some((name) => skillNameKey(name) === newKey);
}

/** Groups of names that clash with each other, as written. */
export function findNameClashGroups(names: string[]): string[][] {
	const byKey = new Map<string, string[]>();
	for (const name of names) {
		const key = skillNameKey(name);
		byKey.set(key, [...(byKey.get(key) ?? []), name]);
	}
	return [...byKey.values()].filter((group) => group.length > 1);
}
