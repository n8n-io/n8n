import { Service } from '@n8n/di';

import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';

import { InstancePullConfig } from './instance-pull.config';

/** A credential the prd instance must have before a PR's package can be imported. */
export interface CredentialRequirement {
	/** Credential id as it appears in the package manifest (the dev-side id). */
	sourceId: string;
	/** Credential type the package's workflow node requires, when known. */
	expectedType?: string;
	/** Source workflow ids that reference this credential. */
	usedByWorkflows: string[];
}

/**
 * In-memory store of "PR #N requires credentials [...]", keyed by PR number.
 *
 * Keyed by PR number ONLY (not head SHA): creating a credential on prd does not
 * change the PR's head SHA, so a SHA-keyed entry would pin the result forever.
 * The dry-run records the latest requirements; the binding page reads them and
 * checks satisfaction live against the prd credential store. POC-only — lost on
 * restart, which is fine because re-running the dry-run repopulates it.
 */
@Service()
export class BindingSessionService {
	private readonly sessions = new Map<string, CredentialRequirement[]>();

	/** Operator-chosen resolutions per PR: source credential id → target credential id on prd. */
	private readonly bindings = new Map<string, Map<string, string>>();

	constructor(private readonly config: InstancePullConfig) {}

	/** Project the dry-run's blocking issues into the per-PR requirement list. */
	record(pr: string, issues: BlockingIssue[]): void {
		const requirements = issues
			.filter(
				(issue): issue is Extract<BlockingIssue, { type: 'credential-unresolved' }> =>
					issue.type === 'credential-unresolved',
			)
			.map((issue) => ({
				sourceId: issue.sourceId,
				expectedType: issue.expectedType,
				usedByWorkflows: issue.usedByWorkflows,
			}));
		this.sessions.set(pr, requirements);
	}

	requirementsFor(pr: string): CredentialRequirement[] {
		return this.sessions.get(pr) ?? [];
	}

	/**
	 * Stable `/credential-binding/<pr>` link on this (prd) instance. Returns '' when
	 * INSTANCE_PULL_PUBLIC_URL is unset, so callers never surface a host-less link.
	 */
	urlFor(pr: string): string {
		const base = this.config.publicUrl.replace(/\/+$/, '');
		if (!base) return '';
		return `${base}/credential-binding/${encodeURIComponent(pr)}`;
	}

	/** Record the operator's resolution for one required credential of a PR. */
	setBinding(pr: string, sourceId: string, targetId: string): void {
		const map = this.bindings.get(pr) ?? new Map<string, string>();
		map.set(sourceId, targetId);
		this.bindings.set(pr, map);
	}

	/** Resolutions chosen for a PR (source → target). Merged into validate + import. */
	bindingsFor(pr: string): Map<string, string> {
		return this.bindings.get(pr) ?? new Map<string, string>();
	}
}
