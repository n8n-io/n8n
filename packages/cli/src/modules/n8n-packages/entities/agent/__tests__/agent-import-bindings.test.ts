import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentImportBindings } from '../agent-import-bindings';
import type { AgentImportMatchService } from '../agent-import-match.service';
import type { AgentPlanItem } from '../agent-import.types';
import type { WorkflowImportMatchService } from '../../workflow/workflow-import-match.service';
import type { WorkflowImportPlan } from '../../workflow/workflow-import.types';

describe('AgentImportBindings', () => {
	it('remaps a workflow guardrail check workflow id', async () => {
		const agentMatcher = mock<AgentImportMatchService>();
		const workflowMatcher = mock<WorkflowImportMatchService>();
		const workflowFinder = mock<WorkflowFinderService>();
		const projectScopeService = mock<ProjectScopeService>();
		agentMatcher.findTaskIdConflicts.mockResolvedValue([]);
		agentMatcher.findBySourceAgentIds.mockResolvedValue(new Map());
		workflowMatcher.findBySourceWorkflowIds.mockResolvedValue({
			matches: new Map(),
			lineageConflicts: [],
		});
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([]);
		workflowFinder.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
		projectScopeService.getProjectIds.mockResolvedValue(null);

		const bindings = new AgentImportBindings(
			agentMatcher,
			workflowMatcher,
			workflowFinder,
			projectScopeService,
		);
		const item = {
			action: 'create',
			sourceAgentId: 'agent-source',
			existing: null,
			tasks: {},
			config: {
				name: 'Support',
				model: 'openai/gpt-4o',
				instructions: '',
				config: {
					guardrails: {
						tools: [{ kind: 'workflow', id: 'check_1', workflowId: 'wf-source' }],
					},
				},
			},
		} as AgentPlanItem;

		const plans = await bindings.resolve([
			{
				input: { context: { user: { id: 'user-1' } as User, projectId: 'project-1' } },
				agentPlan: { items: [item], issues: [] },
				workflowPlan: {
					items: [{ action: 'create', sourceWorkflowId: 'wf-source', decidedId: 'wf-local' }],
					conflicts: [],
					lineageConflicts: [],
					idConflicts: [],
					folderConflicts: [],
					archiveForbidden: [],
				} as unknown as WorkflowImportPlan,
				credentialPlan: { successes: new Map(), stubIds: new Map() },
			},
		]);

		const plan = [...plans.values()][0];
		expect(plan.items[0].config).toMatchObject({
			config: { guardrails: { tools: [{ workflowId: 'wf-local' }] } },
		});
		expect(plan.issues).toEqual([]);
	});
});
