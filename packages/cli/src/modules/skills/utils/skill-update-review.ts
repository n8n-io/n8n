import {
	SKILL_SCAN_LIMIT_FIELDS,
	SKILL_SCAN_RULES,
	type AgentSkillReference,
	type SkillUpdateFile,
	type SkillScanResult,
} from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { diffText } from '@n8n/utils/diff-text';
import isEqual from 'lodash/isEqual';
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
	files: z.array(
		z.object({ path: z.string(), content: z.string(), isBinary: z.literal(true).optional() }),
	),
});

const scanSchema = z.object({
	verdict: z.enum(['pass', 'needs_review', 'blocked']),
	findings: z.array(
		z.object({
			rule: z.enum(SKILL_SCAN_RULES),
			severity: z.enum(['info', 'needs_review', 'blocked']),
			detail: z.string(),
			limit: z
				.object({ field: z.enum(SKILL_SCAN_LIMIT_FIELDS), max: z.number(), current: z.number() })
				.optional(),
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

function filesOf(content: SkillContent): Map<string, AgentSkillReference> {
	return new Map([
		[SKILL_MD, { path: SKILL_MD, content: skillMdText(content).text }],
		...content.files.map((file): [string, AgentSkillReference] => [file.path, file]),
	]);
}

/** Uses the scanner's text representation so findings retain their line and column offsets. */
function previewText(file?: AgentSkillReference): string {
	return file && !file.isBinary ? showHidden(file.content) : '';
}

function fileStatus(
	before?: AgentSkillReference,
	after?: AgentSkillReference,
): SkillUpdateFile['status'] {
	if (!before) return 'added';
	if (!after) return 'removed';
	if (
		(before.isBinary || after.isBinary) &&
		(before.isBinary !== after.isBinary || before.content !== after.content)
	) {
		return 'modified';
	}
	return undefined;
}

export function updateFiles(before: SkillContent, after: SkillContent): SkillUpdateFile[] {
	// Match the incoming key order for unchanged values, including nested maps.
	// Keep the scanned text and its finding offsets intact.
	const from = filesOf({
		...before,
		frontmatter: Object.fromEntries(
			Object.entries({ ...after.frontmatter, ...before.frontmatter })
				.filter(([key]) => Object.hasOwn(before.frontmatter ?? {}, key))
				.map(([key, value]) => [
					key,
					isEqual(value, after.frontmatter?.[key]) ? after.frontmatter?.[key] : value,
				]),
		),
	});
	const to = filesOf(after);
	return [...new Set([...from.keys(), ...to.keys()])].map((path) => {
		const previous = from.get(path);
		const next = to.get(path);
		const status = fileStatus(previous, next);
		return {
			path,
			before: previewText(previous),
			after: previewText(next),
			...(previous?.isBinary ? { beforeIsBinary: true } : {}),
			...(next?.isBinary ? { afterIsBinary: true } : {}),
			...(status ? { status } : {}),
		};
	});
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
