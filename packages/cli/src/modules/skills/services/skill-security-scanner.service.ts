import type { SkillScanFinding, SkillScanResult } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { SkillParseError } from '../errors/skill-parse.error';
import type { SkillContent } from '../utils/skill-content-hash';
import { SKILL_MD } from '../utils/skill-md';
import {
	checkShape,
	findHiddenUnicode,
	findNewUrls,
	findPermissionChanges,
	findSuspiciousPhrases,
	listFidelityWarnings,
	listSkippedFiles,
	type SkillScanInput,
} from '../utils/skill-security-rules';
import type { FetchedSkill } from '../sources/skill-source-client';

const RULES = [
	checkShape,
	listSkippedFiles,
	findHiddenUnicode,
	findNewUrls,
	findPermissionChanges,
	findSuspiciousPhrases,
	listFidelityWarnings,
];

/**
 * The security check of Skill Sync. It rates a skill from a source before the skill enters
 * n8n, at import and on every update. Each rule gives findings, and the most severe finding
 * gives the verdict. No one can override `blocked`.
 */
@Service()
export class SkillSecurityScanner {
	/** `previous` is the content of the latest version for an update, and null at import. */
	scan(
		fetched: Pick<FetchedSkill, 'content' | 'skippedFiles' | 'fidelity'>,
		previous: SkillContent | null = null,
	): SkillScanResult {
		const input: SkillScanInput = { ...fetched, previous };
		return toResult(RULES.flatMap((rule) => rule(input)));
	}

	/** A folder that the SKILL.md reader refused has no content to scan. */
	scanUnreadable(error: SkillParseError): SkillScanResult {
		return toResult([
			{ rule: 'invalid_skill', severity: 'blocked', file: SKILL_MD, detail: error.message },
		]);
	}
}

function toResult(findings: SkillScanFinding[]): SkillScanResult {
	const verdict = findings.some((finding) => finding.severity === 'blocked')
		? 'blocked'
		: findings.some((finding) => finding.severity === 'needs_review')
			? 'needs_review'
			: 'pass';
	return { verdict, findings };
}
