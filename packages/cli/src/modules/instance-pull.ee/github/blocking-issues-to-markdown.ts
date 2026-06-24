import { Service } from '@n8n/di';

import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';
import { UrlService } from '@/services/url.service';

/**
 * Renders the prd validation result into the markdown body of the rolling PR
 * comment. When credentials are missing it embeds a deep link to the prd
 * create-credential form, pre-encoding the `credentialType`/`credentialName`/
 * `credentialId` query params the frontend reads to prefill the form.
 */
@Service()
export class BlockingIssuesToMarkdown {
	constructor(private readonly urlService: UrlService) {}

	/** No blockers → the green/ready comment body. */
	clean(prNumber: number): string {
		return [
			'### n8n publish review',
			'',
			'All requirements satisfied on the target instance. This workflow is **ready to publish** — merge to deploy.',
			'',
			this.diffLink(prNumber),
		].join('\n');
	}

	/** One or more blockers → the red/blocked comment body with CTAs. */
	blocked(issues: BlockingIssue[], prNumber: number): string {
		const lines: string[] = [
			'### n8n publish review',
			'',
			'**Blocked** — the target instance is missing requirements:',
			'',
		];

		for (const issue of issues) {
			lines.push(this.renderIssue(issue));
		}

		lines.push('', this.diffLink(prNumber));
		return lines.join('\n');
	}

	/**
	 * Link to the in-app visual diff on the target instance (current vs incoming),
	 * served by the instance-pull diff route. Reachable by a reviewer logged in to
	 * that instance. (The PR itself can only carry a link or a static image —
	 * GitHub strips live iframes.)
	 */
	private diffLink(prNumber: number): string {
		const base = this.urlService.getInstanceBaseUrl();
		return `🔍 [View diff in n8n](${base}/instance-pull/diff/${prNumber})`;
	}

	private renderIssue(issue: BlockingIssue): string {
		if (issue.type === 'credential-unresolved') {
			return this.renderCredentialIssue(issue);
		}
		// Other blocking issue kinds aren't actionable via a deep link in the demo.
		return `- ${this.describeOther(issue)}`;
	}

	private renderCredentialIssue(
		issue: Extract<BlockingIssue, { type: 'credential-unresolved' }>,
	): string {
		const usedBy = issue.usedByWorkflows.join(', ') || 'unknown workflow';

		if (issue.kind === 'type_mismatch') {
			return [
				`- Credential \`${issue.sourceId}\` has a **type mismatch** on the target`,
				`  (expected \`${issue.expectedType ?? '?'}\`, found \`${issue.actualType ?? '?'}\`).`,
				`  Used by: ${usedBy}.`,
			].join('\n');
		}

		// `not_found` / `source_not_found` / `unknown_type`: prompt creation with the source id.
		const type = issue.expectedType ?? 'unknown';
		const link = this.createCredentialLink({
			credentialType: type,
			credentialName: this.suggestName(issue.sourceId, type),
			credentialId: issue.sourceId,
		});

		return [
			`- Missing credential \`${issue.sourceId}\` (type \`${type}\`). Used by: ${usedBy}.`,
			`  [Create credential](${link})`,
		].join('\n');
	}

	private describeOther(issue: Exclude<BlockingIssue, { type: 'credential-unresolved' }>): string {
		switch (issue.type) {
			case 'workflow-conflict':
				return `Workflow conflict: \`${issue.name}\` (${issue.sourceWorkflowId}) already exists.`;
			case 'workflow-id-conflict':
				return `Workflow id conflict: \`${issue.name}\` (${issue.sourceWorkflowId}).`;
			case 'workflow-folder-conflict':
				return `Workflow folder conflict: \`${issue.name}\` (${issue.sourceWorkflowId}).`;
		}
	}

	/**
	 * Build a deep link to the prd create-credential form. The path matches the
	 * frontend route and the query params match what `CredentialEdit.vue` reads.
	 */
	private createCredentialLink(params: {
		credentialType: string;
		credentialName: string;
		credentialId: string;
	}): string {
		const base = this.urlService.getInstanceBaseUrl();
		const query = new URLSearchParams({
			credentialType: params.credentialType,
			credentialName: params.credentialName,
			credentialId: params.credentialId,
		});
		return `${base}/home/credentials/create?${query.toString()}`;
	}

	private suggestName(sourceId: string, type: string): string {
		return `${type} (${sourceId})`;
	}
}
