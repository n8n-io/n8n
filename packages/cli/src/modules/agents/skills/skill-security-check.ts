import type { SkillCheckFinding, SkillCheckResult, SkillSkippedFile } from '@n8n/api-types';

/** Characters a reader cannot see: zero-width, direction overrides and Unicode tags. */
const HIDDEN_CHARACTERS =
	/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|[\u{E0000}-\u{E007F}]/gu;

/** Wording that asks the model to drop its rules, hide things or send data out. */
const SUSPICIOUS_INSTRUCTIONS = [
	/\b(ignore|disregard|forget)\b[^\n]{0,30}\b(previous|prior|above|earlier|system)\b[^\n]{0,20}\b(instructions?|rules|prompts?|messages?)\b/i,
	/\b(do not|don't|never)\s+(tell|inform|show|mention\b[^\n]{0,20}\bto)\s+the\s+user\b/i,
	/\bwithout\s+(telling|informing|asking)\s+the\s+user\b/i,
	/\b(send|post|upload|forward|transmit|submit)\b[^\n]{0,80}\bhttps?:\/\//i,
	/\b(curl|wget)\b[^\n]{0,80}https?:\/\//i,
];

/** Strings with the shape of a credential. The finding names the line, never the value. */
const SECRET_PATTERNS = [
	/\bAKIA[0-9A-Z]{16}\b/,
	/\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
	/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
	/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/,
	/\bsk-(ant-)?[A-Za-z0-9_-]{20,}\b/,
	/\bAIza[0-9A-Za-z_-]{35}\b/,
	/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
];

const URL_PATTERN = /\bhttps?:\/\/([a-z0-9.-]+)/gi;
const MAX_LINES_LISTED = 3;

type CheckedFile = { path: string; content: string };

function linesMatching(content: string, pattern: RegExp): number[] {
	const lines: number[] = [];
	content.split(/\r?\n/).forEach((line, index) => {
		if (lines.length < MAX_LINES_LISTED && pattern.test(line)) lines.push(index + 1);
	});
	return lines;
}

function lineList(lines: number[]) {
	return `line${lines.length > 1 ? 's' : ''} ${lines.join(', ')}`;
}

/**
 * The checks n8n runs on skill content from outside this instance: GitHub imports and
 * updates, and share links. They are deterministic, so the same content always gets the same result. "blocked" stops
 * the skill; "review" needs a person to confirm.
 */
export function checkSkillContent(
	files: CheckedFile[],
	skippedFiles: SkillSkippedFile[],
): SkillCheckResult {
	const findings: SkillCheckFinding[] = [];
	const domains = new Set<string>();

	for (const file of files) {
		// A byte order mark at the very start is how some editors save UTF-8.
		const text = file.content.replace(/^\uFEFF/, '');

		const hidden = [...text.matchAll(HIDDEN_CHARACTERS)];
		if (hidden.length > 0) {
			const lines = linesMatching(text, new RegExp(HIDDEN_CHARACTERS.source, 'u'));
			findings.push({
				level: 'blocked',
				code: 'hidden_characters',
				message: 'Hidden characters',
				detail: `${hidden.length} on ${lineList(lines)}`,
				file: file.path,
			});
		}

		for (const pattern of SUSPICIOUS_INSTRUCTIONS) {
			const lines = linesMatching(text, pattern);
			if (lines.length === 0) continue;
			findings.push({
				level: 'review',
				code: 'suspicious_instructions',
				message: 'Instructions that may hide things from the user or send data out',
				detail: lineList(lines),
				file: file.path,
			});
			break;
		}

		for (const pattern of SECRET_PATTERNS) {
			const lines = linesMatching(text, pattern);
			if (lines.length === 0) continue;
			findings.push({
				level: 'review',
				code: 'possible_secret',
				message: 'Text that looks like a key or a token',
				detail: lineList(lines),
				file: file.path,
			});
			break;
		}

		for (const match of text.matchAll(URL_PATTERN)) {
			// A link at the end of a sentence takes the period with it.
			const domain = match[1]?.replace(/[.-]+$/, '').toLowerCase();
			if (domain) domains.add(domain);
		}
	}

	if (domains.size > 0) {
		const sorted = [...domains].sort();
		findings.push({
			level: 'review',
			code: 'external_links',
			message: 'Links to external domains',
			detail:
				sorted.slice(0, 10).join(', ') +
				(sorted.length > 10 ? ` and ${sorted.length - 10} more` : ''),
		});
	}

	if (skippedFiles.length > 0) {
		findings.push({
			level: 'review',
			code: 'files_not_imported',
			message: 'Files that n8n does not import',
			detail: skippedFiles
				.slice(0, 5)
				.map((file) => file.path)
				.join(', '),
		});
	}

	const result = findings.some((finding) => finding.level === 'blocked')
		? 'blocked'
		: findings.length > 0
			? 'review'
			: 'passed';
	return { result, findings };
}
