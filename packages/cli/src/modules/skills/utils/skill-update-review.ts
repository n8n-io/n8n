import { SKILL_SCAN_RULES, type SkillUpdateFile, type SkillScanResult } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { diffText } from '@n8n/utils/diff-text';
import { z } from 'zod';

import type { SkillSourceLink } from '../database/entities/skill-source-link.entity';
import type { SkillContent } from './skill-content-hash';
import { showHidden, skillMdText } from './skill-text';
import { SKILL_MD } from './skill-md';

const contentSchema = z.object({
	name: z.string(),
	description: z.string(),
	instructions: z.string(),
	frontmatter: z.record(z.unknown()).nullable(),
	files: z.array(z.object({ path: z.string(), content: z.string() })),
});

const scanSchema = z.object({
	verdict: z.enum(['pass', 'needs_review', 'blocked']),
	findings: z.array(
		z.object({
			rule: z.enum(SKILL_SCAN_RULES),
			severity: z.enum(['info', 'needs_review', 'blocked']),
			detail: z.string(),
			file: z.string().optional(),
			domain: z.string().optional(),
			location: z.object({ line: z.number(), start: z.number(), end: z.number() }).optional(),
		}),
	),
});

/** The stored scan remains authoritative. Invalid stored data must never imply a pass. */
export function pendingScan(link: SkillSourceLink): SkillScanResult {
	const result = scanSchema.safeParse(link.pendingScan);
	if (!result.success) throw new UnexpectedError('Invalid stored skill scan');
	return result.data;
}

export function pendingContent(link: SkillSourceLink): SkillContent | null {
	if (link.pendingContent === null) return null;
	const result = contentSchema.safeParse(link.pendingContent);
	if (!result.success) throw new UnexpectedError('Invalid stored skill update');
	return result.data;
}

/** Uses the scanner's file representation so findings retain their line and column offsets. */
function filesOf(content: SkillContent): Map<string, string> {
	return new Map([
		[SKILL_MD, showHidden(skillMdText(content).text)],
		...content.files.map(({ path, content: text }): [string, string] => [path, showHidden(text)]),
	]);
}

export function updateFiles(before: SkillContent, after: SkillContent): SkillUpdateFile[] {
	const from = filesOf(before);
	const to = filesOf(after);
	return [...new Set([...from.keys(), ...to.keys()])].map((path) => ({
		path,
		before: from.get(path) ?? '',
		after: to.get(path) ?? '',
		...(!from.has(path)
			? { status: 'added' as const }
			: !to.has(path)
				? { status: 'removed' as const }
				: {}),
	}));
}

export function updateCounts(files: SkillUpdateFile[]): { added: number; removed: number } {
	const counts = { added: 0, removed: 0 };
	for (const file of files) {
		const { added, removed } = diffText(file.before, file.after);
		counts.added += added;
		counts.removed += removed;
	}
	return counts;
}
