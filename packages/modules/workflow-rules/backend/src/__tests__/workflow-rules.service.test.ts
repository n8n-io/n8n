import type {
	Project,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { BadRequestError, ConflictError } from '@n8n/errors';
import { ruleSetSchema, type RuleSetInput } from '@n8n/workflow-rules';
import { mock } from 'vitest-mock-extended';

import type { WorkflowRuleExemptionEntity } from '../database/workflow-rule-exemption.entity';
import type { WorkflowRuleExemptionRepository } from '../database/workflow-rule-exemption.repository';
import type { WorkflowRuleSetEntity } from '../database/workflow-rule-set.entity';
import type { WorkflowRuleSetRepository } from '../database/workflow-rule-set.repository';
import type { WorkflowRulesContext } from '../workflow-rules-context';
import { WorkflowRulesService } from '../workflow-rules.service';
import type { WorkflowRulesSnapshot, WorkflowRulesState } from '../workflow-rules.snapshot';

const user = mock<User>({ id: 'user-1' });

function setup(instance: RuleSetInput = {}) {
	const ruleSetRepository = mock<WorkflowRuleSetRepository>();
	const exemptionRepository = mock<WorkflowRuleExemptionRepository>();
	const snapshot = mock<WorkflowRulesSnapshot>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const userRepository = mock<UserRepository>();
	const state: WorkflowRulesState = {
		instance: { ruleSet: ruleSetSchema.parse(instance), version: 1 },
		projects: new Map(),
		exemptions: new Map(),
	};
	snapshot.read.mockResolvedValue(state);
	sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
		new Map([['wf-1', mock<Project>({ id: 'project-1', name: 'Ops' })]]),
	);
	workflowRepository.findByIds.mockResolvedValue([]);
	userRepository.findManyByIds.mockResolvedValue([]);

	const service = new WorkflowRulesService(
		ruleSetRepository,
		exemptionRepository,
		snapshot,
		mock<WorkflowRulesContext>(),
		userRepository,
		mock(),
		workflowRepository,
		sharedWorkflowRepository,
	);
	return { service, ruleSetRepository, exemptionRepository, snapshot };
}

describe('WorkflowRulesService', () => {
	describe('putRuleSet', () => {
		it('rejects a write based on an old version', async () => {
			const { service, ruleSetRepository, snapshot } = setup();
			ruleSetRepository.saveIfVersionMatches.mockResolvedValue(null);

			await expect(
				service.putRuleSet(null, { rules: [], customRules: [] }, 2, user),
			).rejects.toThrow(ConflictError);
			expect(snapshot.refreshAfterWrite).not.toHaveBeenCalled();
		});

		it('drops the adjustable flag from project rule sets and reloads the snapshot', async () => {
			const { service, ruleSetRepository, snapshot } = setup();
			ruleSetRepository.saveIfVersionMatches.mockResolvedValue(
				mock<WorkflowRuleSetEntity>({ version: 1, updatedAt: new Date() }),
			);

			await service.putRuleSet(
				'project-1',
				ruleSetSchema.parse({
					rules: [{ ruleId: 'no-disabled-nodes', severity: 'warn', adjustable: true }],
				}),
				0,
				user,
			);

			expect(ruleSetRepository.saveIfVersionMatches).toHaveBeenCalledWith(
				'project-1',
				{ rules: [{ ruleId: 'no-disabled-nodes', severity: 'warn' }], customRules: [] },
				0,
				'user-1',
				{},
			);
			expect(snapshot.refreshAfterWrite).toHaveBeenCalled();
		});
	});

	describe('createExemption', () => {
		const grant = {
			workflowId: 'wf-1',
			ruleId: 'no-disabled-nodes',
			reason: 'Kept for a rollback',
		};

		it('lets a project admin exempt from an adjustable instance rule', async () => {
			const { service, exemptionRepository } = setup({
				rules: [{ ruleId: 'no-disabled-nodes', severity: 'block', adjustable: true }],
			});
			exemptionRepository.createUnlessExists.mockResolvedValue(
				mock<WorkflowRuleExemptionEntity>({
					...grant,
					id: 7,
					createdById: null,
					createdAt: new Date(),
				}),
			);

			const created = await service.createExemption(grant, {
				kind: 'project',
				user,
				projectId: 'project-1',
			});

			expect(created).toMatchObject({ id: 7, projectId: 'project-1', projectName: 'Ops' });
		});

		it('keeps tighten-only instance rules for instance admins', async () => {
			const { service, exemptionRepository } = setup({
				rules: [{ ruleId: 'no-disabled-nodes', severity: 'block' }],
			});

			await expect(
				service.createExemption(grant, { kind: 'project', user, projectId: 'project-1' }),
			).rejects.toThrow(BadRequestError);
			expect(exemptionRepository.createUnlessExists).not.toHaveBeenCalled();
		});

		it('refuses an exemption for a rule that is not on', async () => {
			const { service } = setup({});

			await expect(service.createExemption(grant, { kind: 'instance', user })).rejects.toThrow(
				BadRequestError,
			);
		});

		it('hides workflows of other projects from a project admin', async () => {
			const { service } = setup({
				rules: [{ ruleId: 'no-disabled-nodes', severity: 'block', adjustable: true }],
			});

			await expect(
				service.createExemption(grant, { kind: 'project', user, projectId: 'project-9' }),
			).rejects.toThrow('Workflow not found');
		});
	});
});
