import type { MigrationNotifyResult, MigrationNotifySkipReason } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { UserManagementMailer } from '@/user-management/email/user-management-mailer';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import {
	MigrationFindingRepository,
	type TriageableMigrationFinding,
} from '../database/repositories/migration-finding.repository';
import { MigrationWorkflowOwnerRepository } from '../database/repositories/migration-workflow-owner.repository';
import { isWorkflowLevelRule } from '../types';

/** The minimum wait before a notified finding can be emailed again. */
export const REMINDER_COOLDOWN_MS = 60_000;

/** The user as the email names them. */
function displayName(user: Pick<User, 'firstName' | 'lastName' | 'email'>): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'An admin';
}

/**
 * Emails the owners of workflows about one rule's findings on them and records
 * the notification on the findings. One email per owner lists all their workflows.
 */
@Service()
export class MigrationFindingNotificationService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly findingRepository: MigrationFindingRepository,
		private readonly ownerRepository: MigrationWorkflowOwnerRepository,
		private readonly userRepository: UserRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	/**
	 * Notifies the owners of the given workflows about the rule's finding on them.
	 * A finding is marked notified only when its owner's email went out, so the
	 * report never claims a notification that nobody received. A notified finding
	 * is emailed again as a reminder, once the cooldown has passed. A workflow whose
	 * finding is won't fix or missing, whose owner was notified within the cooldown,
	 * or that has no owner with an email, is reported as skipped.
	 */
	async notifyOwners(
		ruleId: string,
		workflowIds: string[],
		notifier: User,
	): Promise<MigrationNotifyResult> {
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule || !isWorkflowLevelRule(rule)) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}
		if (!this.mailer.isEmailSetUp) {
			throw new BadRequestError(
				'Email is not set up on this instance, so owners cannot be notified',
			);
		}
		const { version, title } = rule.getMetadata();

		const result: MigrationNotifyResult = { notifiedWorkflowIds: [], skipped: [] };
		const skip = (ids: string[], reason: MigrationNotifySkipReason) => {
			for (const workflowId of ids) result.skipped.push({ workflowId, reason });
		};

		// Only a finding that still needs a fix is worth an email. A won't fix one is resolved.
		const findings = (
			await this.findingRepository.listTriageableForRule(version, ruleId, workflowIds, {})
		).filter((finding) => finding.status !== 'wont_fix');
		const findingByWorkflow = new Map(findings.map((finding) => [finding.workflowId, finding]));
		skip(
			workflowIds.filter((workflowId) => !findingByWorkflow.has(workflowId)),
			'no_finding',
		);

		// Keeps repeated clicks on Remind from flooding the owner's inbox.
		const cooldownStart = Date.now() - REMINDER_COOLDOWN_MS;
		const isRecentlyNotified = (finding: TriageableMigrationFinding) =>
			finding.notifiedAt !== null && finding.notifiedAt.getTime() > cooldownStart;
		skip(
			findings.filter(isRecentlyNotified).map((finding) => finding.workflowId),
			'recently_notified',
		);
		const dueFindings = findings.filter((finding) => !isRecentlyNotified(finding));

		const findingsByOwner = await this.groupByOwner(dueFindings);
		skip(
			dueFindings
				.filter((finding) => !findingsByOwner.has(finding.workflowId))
				.map((finding) => finding.workflowId),
			'no_owner',
		);

		const reportUrl = `${this.urlService.getInstanceBaseUrl()}/settings/migration-report/${ruleId}`;
		const notifierName = displayName(notifier);
		await Promise.all(
			[...new Set(findingsByOwner.values())].map(async ({ owner, findings: ownerFindings }) => {
				const ownerWorkflowIds = ownerFindings.map((finding) => finding.workflowId);
				let emailSent = false;
				try {
					({ emailSent } = await this.mailer.migrationFindings({
						email: owner.email,
						firstName: owner.firstName,
						notifierName,
						ruleTitle: title,
						targetVersion: version,
						workflows: ownerFindings.map((finding) => ({
							id: finding.workflowId,
							name: finding.workflow.name,
						})),
						reportUrl,
					}));
				} catch (error) {
					this.logger.warn('Emailing a workflow owner about migration findings failed', {
						ruleId,
						ownerId: owner.id,
						error,
					});
				}
				if (!emailSent) {
					skip(ownerWorkflowIds, 'send_failed');
					return;
				}

				// The email is out either way. A failed mark must not read as a failed send,
				// or the user re-sends it.
				try {
					await this.findingRepository.markNotifiedForIds(
						ownerFindings.map((finding) => finding.id),
						{},
					);
				} catch (error) {
					this.logger.error(
						'The owner was emailed, but the findings could not be marked notified',
						{
							ruleId,
							ownerId: owner.id,
							error,
						},
					);
				}
				result.notifiedWorkflowIds.push(...ownerWorkflowIds);
			}),
		);

		return result;
	}

	/**
	 * The group of each workflow id: the owner who receives the email and all
	 * their findings. A workflow whose owner is gone or has no email is left out.
	 */
	private async groupByOwner(findings: TriageableMigrationFinding[]) {
		type Owner = Pick<User, 'id' | 'firstName' | 'lastName'> & { email: string };
		type Group = { owner: Owner; findings: TriageableMigrationFinding[] };

		const ownerRows = await this.ownerRepository.findByWorkflowIds(
			findings.map((finding) => finding.workflowId),
			{},
		);
		const userIds = [...new Set(ownerRows.flatMap((row) => (row.userId ? [row.userId] : [])))];
		const users = userIds.length > 0 ? await this.userRepository.findManyByIds(userIds) : [];
		const usersById = new Map(users.map((user) => [user.id, user]));
		const ownerIdByWorkflow = new Map(ownerRows.map((row) => [row.workflowId, row.userId]));

		const groupsByOwner = new Map<string, Group>();
		const groupsByWorkflow = new Map<string, Group>();
		for (const finding of findings) {
			const userId = ownerIdByWorkflow.get(finding.workflowId);
			const user = userId ? usersById.get(userId) : undefined;
			if (!user?.email) continue;
			const group = groupsByOwner.get(user.id) ?? {
				owner: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
				},
				findings: [],
			};
			group.findings.push(finding);
			groupsByOwner.set(user.id, group);
			groupsByWorkflow.set(finding.workflowId, group);
		}
		return groupsByWorkflow;
	}
}
