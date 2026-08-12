// Validates the JSON review produced by the ai-pr-review skill before it is
// sent to the n8n publisher. Findings whose (path, line, side) anchor does not
// exist in the PR diff are demoted to `unanchored_findings` rather than
// dropped, so no finding is ever lost silently.

export const VERDICTS = [
	'looks_good',
	'minor_issues',
	'needs_changes',
	'needs_discussion',
	'insufficient_context',
];

export const SEVERITIES = ['blocker', 'major', 'minor', 'nit'];

export const CATEGORIES = [
	'correctness',
	'security',
	'architecture',
	'complexity',
	'tests',
	'conventions',
	'performance',
];

const SCHEMA_VERSION = 1;
const SIDES = ['RIGHT', 'LEFT'];
const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

/**
 * Parses a unified diff into a per-file index of commentable line numbers.
 *
 * @param {string} diffText output of `gh pr diff` / `git diff`
 * @returns {Map<string, { right: Set<number>, left: Set<number> }>} keyed by
 *   new-side file path; `right` holds added + context lines (new file numbering),
 *   `left` holds removed + context lines (old file numbering).
 */
export function parseUnifiedDiff(diffText) {
	const index = new Map();
	let file = null;
	let rightLine = 0;
	let leftLine = 0;
	let inHunk = false;

	for (const line of diffText.split('\n')) {
		if (line.startsWith('diff --git ')) {
			file = null;
			inHunk = false;
			continue;
		}
		if (line.startsWith('+++ ')) {
			const path = line.slice(4).trim();
			if (path === '/dev/null') {
				file = null;
			} else {
				const normalized = path.startsWith('b/') ? path.slice(2) : path;
				file = { right: new Set(), left: new Set() };
				index.set(normalized, file);
			}
			inHunk = false;
			continue;
		}
		const hunkHeader = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
		if (hunkHeader) {
			leftLine = Number(hunkHeader[1]);
			rightLine = Number(hunkHeader[2]);
			inHunk = file !== null;
			continue;
		}
		if (!inHunk || file === null) continue;

		if (line.startsWith('+')) {
			file.right.add(rightLine);
			rightLine += 1;
		} else if (line.startsWith('-')) {
			file.left.add(leftLine);
			leftLine += 1;
		} else if (line.startsWith(' ') || line === '') {
			file.right.add(rightLine);
			file.left.add(leftLine);
			rightLine += 1;
			leftLine += 1;
		} else {
			// e.g. "\ No newline at end of file"
			continue;
		}
	}

	return index;
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

function validateFindingShape(finding, position, errors) {
	const label = `findings[${position}]`;
	if (typeof finding !== 'object' || finding === null) {
		errors.push(`${label}: must be an object`);
		return null;
	}

	const normalized = {
		...finding,
		side: finding.side ?? 'RIGHT',
		start_line: finding.start_line ?? null,
		carried_over: finding.carried_over ?? false,
	};

	if (!isNonEmptyString(normalized.id)) errors.push(`${label}: id must be a non-empty string`);
	if (!isNonEmptyString(normalized.path) || normalized.path.startsWith('/')) {
		errors.push(`${label}: path must be a repo-relative file path`);
	}
	if (!isPositiveInt(normalized.line)) errors.push(`${label}: line must be a positive integer`);
	if (!SIDES.includes(normalized.side)) errors.push(`${label}: side must be one of ${SIDES.join(', ')}`);
	if (normalized.start_line !== null) {
		if (!isPositiveInt(normalized.start_line) || normalized.start_line >= normalized.line) {
			errors.push(`${label}: start_line must be a positive integer strictly before line`);
		}
	}
	if (!SEVERITIES.includes(normalized.severity)) {
		errors.push(`${label}: severity must be one of ${SEVERITIES.join(', ')}`);
	}
	if (!CATEGORIES.includes(normalized.category)) {
		errors.push(`${label}: category must be one of ${CATEGORIES.join(', ')}`);
	}
	if (!isNonEmptyString(normalized.rule)) errors.push(`${label}: rule must be a non-empty string`);
	if (
		typeof normalized.confidence !== 'number' ||
		normalized.confidence < 0 ||
		normalized.confidence > 1
	) {
		errors.push(`${label}: confidence must be a number between 0 and 1`);
	}
	if (!isNonEmptyString(normalized.title)) errors.push(`${label}: title must be a non-empty string`);
	if (!isNonEmptyString(normalized.body_markdown)) {
		errors.push(`${label}: body_markdown must be a non-empty string`);
	}
	if (typeof normalized.carried_over !== 'boolean') {
		errors.push(`${label}: carried_over must be a boolean`);
	}

	return normalized;
}

/**
 * Is the finding's anchor a commentable position in the diff? A multi-line
 * range is anchored only when every line in the range is commentable.
 */
function isAnchored(finding, diffIndex) {
	const file = diffIndex.get(finding.path);
	if (!file) return false;
	const lines = finding.side === 'LEFT' ? file.left : file.right;
	const from = finding.start_line ?? finding.line;
	for (let line = from; line <= finding.line; line += 1) {
		if (!lines.has(line)) return false;
	}
	return true;
}

/**
 * @param {unknown} review parsed JSON produced by the skill
 * @param {ReturnType<typeof parseUnifiedDiff>} diffIndex
 * @returns {{ ok: boolean, errors: string[], review: object | null }} On
 *   success, `review` is the normalized review with findings partitioned into
 *   `findings` (anchored) and `unanchored_findings`.
 */
export function validateReviewOutput(review, diffIndex) {
	const errors = [];

	if (typeof review !== 'object' || review === null) {
		return { ok: false, errors: ['review must be a JSON object'], review: null };
	}

	if (review.schema_version !== SCHEMA_VERSION) {
		errors.push(`schema_version must be ${SCHEMA_VERSION}`);
	}
	if (!isPositiveInt(review.pr_number)) errors.push('pr_number must be a positive integer');
	if (typeof review.head_sha !== 'string' || !SHA_PATTERN.test(review.head_sha)) {
		errors.push('head_sha must be a git commit sha');
	}
	if (!VERDICTS.includes(review.verdict)) {
		errors.push(`verdict must be one of ${VERDICTS.join(', ')}`);
	}
	if (
		typeof review.alignment !== 'object' ||
		review.alignment === null ||
		typeof review.alignment.matches_description !== 'boolean' ||
		typeof review.alignment.notes !== 'string'
	) {
		errors.push('alignment must be { matches_description: boolean, notes: string }');
	}
	if (!isNonEmptyString(review.summary_markdown)) {
		errors.push('summary_markdown must be a non-empty string');
	}
	if (!Array.isArray(review.findings)) {
		errors.push('findings must be an array');
	}

	const normalizedFindings = [];
	if (Array.isArray(review.findings)) {
		const seenIds = new Set();
		review.findings.forEach((finding, position) => {
			const normalized = validateFindingShape(finding, position, errors);
			if (normalized === null) return;
			if (seenIds.has(normalized.id)) {
				errors.push(`findings[${position}]: duplicate finding id "${normalized.id}"`);
			}
			seenIds.add(normalized.id);
			normalizedFindings.push(normalized);
		});
	}

	if (errors.length > 0) {
		return { ok: false, errors, review: null };
	}

	const anchored = [];
	const unanchored = [];
	for (const finding of normalizedFindings) {
		(isAnchored(finding, diffIndex) ? anchored : unanchored).push(finding);
	}

	return {
		ok: true,
		errors: [],
		review: { ...review, findings: anchored, unanchored_findings: unanchored },
	};
}

async function main() {
	const { readFileSync } = await import('node:fs');
	const [reviewPath, diffPath] = process.argv.slice(2);
	if (!reviewPath || !diffPath) {
		console.error('Usage: node validate-review-output.mjs <review.json> <pr.diff>');
		process.exit(2);
	}

	let review;
	try {
		review = JSON.parse(readFileSync(reviewPath, 'utf8'));
	} catch (error) {
		console.error(`Failed to parse ${reviewPath}: ${error.message}`);
		process.exit(1);
	}

	const diffIndex = parseUnifiedDiff(readFileSync(diffPath, 'utf8'));
	const result = validateReviewOutput(review, diffIndex);

	if (!result.ok) {
		console.error('Review output is invalid:');
		for (const error of result.errors) console.error(`  - ${error}`);
		process.exit(1);
	}

	console.log(JSON.stringify(result.review, null, 2));
	if (result.review.unanchored_findings.length > 0) {
		console.error(
			`Note: ${result.review.unanchored_findings.length} finding(s) demoted to unanchored_findings`,
		);
	}
}

const isDirectRun =
	process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) await main();
