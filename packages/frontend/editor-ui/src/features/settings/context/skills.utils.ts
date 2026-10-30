import {
	SKILL_SOURCE_MAX_SKILLS,
	type SkillListItem,
	type SkillScanFinding,
	type SkillScanRule,
	type SkillSourceReason,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';

export const PROJECT_SCOPE_PREFIX = 'project:';

/** Settings creates and moves skills only to a project or the instance, never to one agent. */
export function parseScope(value: string): { scope: 'project' | 'instance'; projectId?: string } {
	if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
		return { scope: 'project', projectId: value.slice(PROJECT_SCOPE_PREFIX.length) };
	}
	return { scope: 'instance' };
}

export type SkillScopeDisplay = { icon: IconName; label: string };

/** How the badge and the modal name the scope of a skill. */
export function useSkillScopeDisplay() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();

	function projectLabel(
		projectId: string,
		projectName: string | null,
		projectType: SkillListItem['projectType'],
	) {
		if (projectId === projectsStore.personalProject?.id) {
			return i18n.baseText('settings.context.skills.scope.personalProject');
		}
		if (projectType === 'personal' && projectName) {
			// A personal project is named `First Last <email>`; the owner is the name part.
			const { name, email } = splitName(projectName);
			return name ?? email ?? projectName;
		}
		// A project the viewer cannot read is still listed, so fall back to a neutral label.
		return projectName ?? i18n.baseText('settings.context.skills.scope.project');
	}

	function scopeDisplay(
		skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType' | 'agentName'>,
	): SkillScopeDisplay {
		switch (skill.scope) {
			case 'instance':
				return { icon: 'globe', label: i18n.baseText('settings.context.skills.scope.instance') };
			case 'agent':
				return {
					icon: 'bot',
					label: skill.agentName
						? i18n.baseText('settings.context.skills.scope.agent', {
								interpolate: { name: skill.agentName },
							})
						: i18n.baseText('settings.context.skills.scope.agentFallback'),
				};
			case 'project':
				if (!skill.projectId) {
					return { icon: 'layers', label: i18n.baseText('settings.context.skills.scope.project') };
				}
				return {
					icon: skill.projectType === 'personal' ? 'user' : 'layers',
					label: projectLabel(skill.projectId, skill.projectName, skill.projectType),
				};
		}
	}

	return { scopeDisplay };
}

/**
 * Why a skill cannot be deleted now, or undefined when it can. The backend refuses to
 * delete a skill that an agent uses, so the action is off before the user tries.
 */
export function useSkillDeleteRule() {
	const i18n = useI18n();

	function deleteBlockedReason(
		skill: Pick<SkillListItem, 'canDelete' | 'usedByAgents'>,
	): string | undefined {
		if (!skill.canDelete) return i18n.baseText('settings.context.skills.readOnly');
		if (skill.usedByAgents === 0) return undefined;
		return i18n.baseText('settings.context.skills.delete.inUse', {
			interpolate: { count: skill.usedByAgents },
			adjustToNumber: skill.usedByAgents,
		});
	}

	return { deleteBlockedReason };
}

/** The text for each reason code. A code that the editor does not know gets the generic text. */
const SKILL_SOURCE_REASON_KEYS = {
	invalid_url: 'settings.context.skills.connect.error.invalidUrl',
	unsupported_provider: 'settings.context.skills.connect.error.unsupportedProvider',
	not_found: 'settings.context.skills.connect.error.notFound',
	rate_limited: 'settings.context.skills.connect.error.rateLimited',
	unreachable: 'settings.context.skills.connect.error.unreachable',
	no_skills_found: 'settings.context.skills.connect.error.noSkillsFound',
	too_many_skills: 'settings.context.skills.connect.error.tooManySkills',
	too_deep: 'settings.context.skills.connect.error.tooDeep',
	archive_too_large: 'settings.context.skills.connect.error.archiveTooLarge',
	parse_error: 'settings.context.skills.connect.error.parseError',
	blocked_by_check: 'settings.context.skills.connect.error.blockedByCheck',
	review_required: 'settings.context.skills.connect.error.reviewRequired',
	name_taken: 'settings.context.skills.connect.error.nameTaken',
	duplicate_source: 'settings.context.skills.connect.error.duplicateSource',
	credential_invalid: 'settings.context.skills.connect.error.credentialInvalid',
	credential_missing: 'settings.context.skills.connect.error.credentialMissing',
	credential_out_of_scope: 'settings.context.skills.connect.error.credentialOutOfScope',
	host_blocked: 'settings.context.skills.connect.error.hostBlocked',
} satisfies Record<SkillSourceReason, BaseTextKey>;

/** The short form in the import toast, as in "Could not add seo-check (reason)". */
const FAILED_SKILL_REASON_KEYS: Partial<Record<SkillSourceReason, BaseTextKey>> = {
	name_taken: 'settings.context.skills.connect.failed.reason.nameTaken',
	not_found: 'settings.context.skills.connect.failed.reason.notFound',
	parse_error: 'settings.context.skills.connect.failed.reason.parseError',
	blocked_by_check: 'settings.context.skills.connect.failed.reason.blockedByCheck',
	review_required: 'settings.context.skills.connect.failed.reason.reviewRequired',
	rate_limited: 'settings.context.skills.connect.failed.reason.rateLimited',
	unreachable: 'settings.context.skills.connect.failed.reason.unreachable',
};

/** The text for each rule of the security check. The server text is English only. */
const SKILL_SCAN_RULE_KEYS = {
	invalid_skill: 'settings.context.skills.connect.check.rule.invalidSkill',
	over_limit: 'settings.context.skills.connect.check.rule.overLimit',
	file_skipped: 'settings.context.skills.connect.check.rule.fileSkipped',
	hidden_unicode: 'settings.context.skills.connect.check.rule.hiddenUnicode',
	new_url: 'settings.context.skills.connect.check.rule.newUrl',
	permission_change: 'settings.context.skills.connect.check.rule.permissionChange',
	suspicious_phrase: 'settings.context.skills.connect.check.rule.suspiciousPhrase',
	lossy_conversion: 'settings.context.skills.connect.check.rule.lossyConversion',
} satisfies Record<SkillScanRule, BaseTextKey>;

/** A link to a branch, a folder on a branch, or a file on a branch. */
const GITHUB_BRANCH_LINK =
	/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/(tree|blob)\/[^/?#]+/i;

function isKnownReason(reason: unknown): reason is SkillSourceReason {
	return typeof reason === 'string' && reason in SKILL_SOURCE_REASON_KEYS;
}

/** Translated text for the reason codes of Skill Sync, for the link, the picker and the toast. */
export function useSkillSourceReasons() {
	const i18n = useI18n();

	/**
	 * A full sentence for why n8n cannot read a link or one skill in it. `link` is the link the
	 * user pasted: a well-formed branch link with `invalid_url` means the branch is missing.
	 * `withCredential` says that the read used a credential.
	 */
	function reasonText(
		reason: unknown,
		link?: string,
		{ withCredential = false }: { withCredential?: boolean } = {},
	): string {
		if (!isKnownReason(reason)) {
			return i18n.baseText('settings.context.skills.connect.error.discover');
		}
		// With a credential, a missing repository means the credential cannot read it.
		if (reason === 'not_found' && withCredential) {
			return i18n.baseText('settings.context.skills.connect.error.notFoundWithCredential');
		}
		if (reason === 'invalid_url' && link && GITHUB_BRANCH_LINK.test(link)) {
			return i18n.baseText('settings.context.skills.connect.error.branchNotFound');
		}
		if (reason === 'too_many_skills') {
			return i18n.baseText('settings.context.skills.connect.error.tooManySkills', {
				interpolate: { count: SKILL_SOURCE_MAX_SKILLS },
			});
		}
		return i18n.baseText(SKILL_SOURCE_REASON_KEYS[reason]);
	}

	/** The short reason for a picked skill that did not come in. */
	function failedSkillReason(reason: SkillSourceReason): string {
		return i18n.baseText(
			FAILED_SKILL_REASON_KEYS[reason] ?? 'settings.context.skills.connect.failed.reason.other',
		);
	}

	/**
	 * The findings that need review or block the skill, each rule and file one time. `info`
	 * findings change nothing, and the picker lists skipped files on their own line.
	 */
	function findingsText(findings: SkillScanFinding[]): string {
		const texts = findings
			.filter((finding) => finding.severity !== 'info')
			.map(({ rule, file }) => {
				const finding = i18n.baseText(SKILL_SCAN_RULE_KEYS[rule]);
				return file
					? i18n.baseText('settings.context.skills.connect.check.findingInFile', {
							interpolate: { finding, file },
						})
					: finding;
			});
		return [...new Set(texts)].join('. ');
	}

	/**
	 * The domains that a skill links to. At import a link needs no review, but the user still
	 * sees where the skill can send an agent.
	 */
	function linkedDomainsText(findings: SkillScanFinding[]): string {
		const domains = new Set(
			findings.flatMap((finding) =>
				finding.rule === 'new_url' && finding.domain ? [finding.domain] : [],
			),
		);
		if (domains.size === 0) return '';
		return i18n.baseText('settings.context.skills.connect.check.linksTo', {
			interpolate: { domains: [...domains].join(', ') },
		});
	}

	return { reasonText, failedSkillReason, findingsText, linkedDomainsText };
}
