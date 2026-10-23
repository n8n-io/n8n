import type { UrlService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User, UserRepository } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { UserManagementMailer } from '@/user-management/email/user-management-mailer';

import type { RuleRegistry } from '../../breaking-changes.rule-registry.service';
import type {
	MigrationFindingRepository,
	TriageableMigrationFinding,
} from '../../database/repositories/migration-finding.repository';
import type { MigrationWorkflowOwnerRepository } from '../../database/repositories/migration-workflow-owner.repository';
import type { MigrationWorkflowOwner } from '../../database/entities/migration-workflow-owner.entity';
import type { IBreakingChangeRule } from '../../types';
import { MigrationFindingNotificationService } from '../migration-finding-notification.service';

const RULE_ID = 'removed-nodes-v3';
const notifier = {
	id: 'admin',
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@n8n.io',
} as User;

function user(id: string, email: string | null = `${id}@example.com`): User {
	return { id, firstName: id, lastName: null, email } as unknown as User;
}

function finding(
	id: number,
	workflowId: string,
	status: TriageableMigrationFinding['status'] = 'open',
): TriageableMigrationFinding {
	return {
		id,
		ruleId: RULE_ID,
		workflowId,
		status,
		notifiedAt: null,
		workflow: {
			id: workflowId,
			name: `Flow ${workflowId}`,
			activeVersionId: null,
			updatedAt: new Date(),
		},
	};
}

function ownerRow(workflowId: string, userId: string | null): MigrationWorkflowOwner {
	return { workflowId, userId, source: 'assigned' } as MigrationWorkflowOwner;
}

describe('MigrationFindingNotificationService', () => {
	let ruleRegistry: MockProxy<RuleRegistry>;
	let findingRepository: MockProxy<MigrationFindingRepository>;
	let ownerRepository: MockProxy<MigrationWorkflowOwnerRepository>;
	let userRepository: MockProxy<UserRepository>;
	let mailer: MockProxy<UserManagementMailer>;
	let service: MigrationFindingNotificationService;

	beforeEach(() => {
		ruleRegistry = mock<RuleRegistry>();
		findingRepository = mock<MigrationFindingRepository>();
		ownerRepository = mock<MigrationWorkflowOwnerRepository>();
		userRepository = mock<UserRepository>();
		mailer = mock<UserManagementMailer>({ isEmailSetUp: true });
		const urlService = mock<UrlService>();
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example');
		service = new MigrationFindingNotificationService(
			ruleRegistry,
			findingRepository,
			ownerRepository,
			userRepository,
			mailer,
			urlService,
			mockLogger(),
		);

		// A plain object, not a proxy: the service tells rule kinds apart by their methods.
		const rule = {
			id: RULE_ID,
			getMetadata: () => ({ version: 'v3', title: 'Removed nodes' }),
			detectWorkflow: vi.fn(),
		};
		ruleRegistry.getRule
			.calledWith(RULE_ID)
			.mockReturnValue(rule as unknown as IBreakingChangeRule);
		mailer.migrationFindings.mockResolvedValue({ emailSent: true });
	});

	describe('notifyOwners', () => {
		it('sends one email per owner with all their workflows and marks those findings notified', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				finding(1, 'wf-1'),
				finding(2, 'wf-2', 'notified'),
				finding(3, 'wf-3'),
			]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([
				ownerRow('wf-1', 'alice'),
				ownerRow('wf-2', 'alice'),
				ownerRow('wf-3', 'bob'),
			]);
			userRepository.findManyByIds.mockResolvedValue([user('alice'), user('bob')]);

			const result = await service.notifyOwners(RULE_ID, ['wf-1', 'wf-2', 'wf-3'], notifier);

			expect(findingRepository.listTriageableForRule).toHaveBeenCalledWith(
				'v3',
				RULE_ID,
				['wf-1', 'wf-2', 'wf-3'],
				expect.anything(),
			);
			expect(mailer.migrationFindings).toHaveBeenCalledTimes(2);
			expect(mailer.migrationFindings).toHaveBeenCalledWith({
				email: 'alice@example.com',
				firstName: 'alice',
				notifierName: 'Ada Lovelace',
				ruleTitle: 'Removed nodes',
				targetVersion: 'v3',
				workflows: [
					{ id: 'wf-1', name: 'Flow wf-1' },
					{ id: 'wf-2', name: 'Flow wf-2' },
				],
				reportUrl: `https://n8n.example/settings/migration-report/${RULE_ID}`,
			});
			expect(findingRepository.markNotifiedForIds).toHaveBeenCalledWith([1, 2], expect.anything());
			expect(findingRepository.markNotifiedForIds).toHaveBeenCalledWith([3], expect.anything());
			expect(result.notifiedWorkflowIds.sort()).toEqual(['wf-1', 'wf-2', 'wf-3']);
			expect(result.skipped).toEqual([]);
		});

		it('skips a workflow without a finding that needs a fix, and one without an owner email', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				finding(1, 'wf-1'),
				finding(2, 'wf-2', 'wont_fix'),
				finding(3, 'wf-3'),
				finding(4, 'wf-4'),
				finding(5, 'wf-5'),
			]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([
				ownerRow('wf-1', 'alice'),
				ownerRow('wf-3', null),
				ownerRow('wf-4', 'gone'),
				ownerRow('wf-5', 'noemail'),
			]);
			userRepository.findManyByIds.mockResolvedValue([user('alice'), user('noemail', null)]);

			const result = await service.notifyOwners(
				RULE_ID,
				['wf-1', 'wf-2', 'wf-3', 'wf-4', 'wf-5', 'wf-6'],
				notifier,
			);

			expect(mailer.migrationFindings).toHaveBeenCalledTimes(1);
			expect(result.notifiedWorkflowIds).toEqual(['wf-1']);
			expect(result.skipped).toEqual(
				expect.arrayContaining([
					{ workflowId: 'wf-2', reason: 'no_finding' },
					{ workflowId: 'wf-6', reason: 'no_finding' },
					{ workflowId: 'wf-3', reason: 'no_owner' },
					{ workflowId: 'wf-4', reason: 'no_owner' },
					{ workflowId: 'wf-5', reason: 'no_owner' },
				]),
			);
			expect(result.skipped).toHaveLength(5);
		});

		it('leaves the findings of an owner untouched when their email fails', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				finding(1, 'wf-1'),
				finding(2, 'wf-2'),
			]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([
				ownerRow('wf-1', 'alice'),
				ownerRow('wf-2', 'bob'),
			]);
			userRepository.findManyByIds.mockResolvedValue([user('alice'), user('bob')]);
			mailer.migrationFindings.mockImplementation(async ({ email }) => {
				if (email === 'alice@example.com') throw new Error('SMTP down');
				return { emailSent: true };
			});

			const result = await service.notifyOwners(RULE_ID, ['wf-1', 'wf-2'], notifier);

			expect(findingRepository.markNotifiedForIds).toHaveBeenCalledTimes(1);
			expect(findingRepository.markNotifiedForIds).toHaveBeenCalledWith([2], expect.anything());
			expect(result.notifiedWorkflowIds).toEqual(['wf-2']);
			expect(result.skipped).toEqual([{ workflowId: 'wf-1', reason: 'send_failed' }]);
		});

		it('still reports the workflows notified when the email went out but the mark failed', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([finding(1, 'wf-1')]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([ownerRow('wf-1', 'alice')]);
			userRepository.findManyByIds.mockResolvedValue([user('alice')]);
			findingRepository.markNotifiedForIds.mockRejectedValue(new Error('DB down'));

			const result = await service.notifyOwners(RULE_ID, ['wf-1'], notifier);

			expect(mailer.migrationFindings).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ notifiedWorkflowIds: ['wf-1'], skipped: [] });
		});

		it('skips the owner as send failed when the mailer sends nothing', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([finding(1, 'wf-1')]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([ownerRow('wf-1', 'alice')]);
			userRepository.findManyByIds.mockResolvedValue([user('alice')]);
			mailer.migrationFindings.mockResolvedValue({ emailSent: false });

			const result = await service.notifyOwners(RULE_ID, ['wf-1'], notifier);

			expect(findingRepository.markNotifiedForIds).not.toHaveBeenCalled();
			expect(result).toEqual({
				notifiedWorkflowIds: [],
				skipped: [{ workflowId: 'wf-1', reason: 'send_failed' }],
			});
		});

		it('rejects the request before reading anything when email is not set up', async () => {
			mailer = mock<UserManagementMailer>({ isEmailSetUp: false });
			service = new MigrationFindingNotificationService(
				ruleRegistry,
				findingRepository,
				ownerRepository,
				userRepository,
				mailer,
				mock<UrlService>(),
				mockLogger(),
			);

			await expect(service.notifyOwners(RULE_ID, ['wf-1'], notifier)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(findingRepository.listTriageableForRule).not.toHaveBeenCalled();
		});

		it('rejects an unknown rule with not-found', async () => {
			await expect(service.notifyOwners('unknown', ['wf-1'], notifier)).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});
});
