import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentImportBindings, type AgentImportBindingScope } from '../agent-import-bindings';
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

	it('remaps the decision workflow and preserves interaction identity during import planning', async () => {
		const agents = mock<AgentImportMatchService>();
		agents.findBySourceAgentIds.mockResolvedValue(new Map());
		agents.findTaskIdConflicts.mockResolvedValue([]);
		const workflows = mock<WorkflowImportMatchService>();
		workflows.findBySourceWorkflowIds.mockResolvedValue({
			matches: new Map(),
			lineageConflicts: [],
		});
		const finder = mock<WorkflowFinderService>();
		finder.findWorkflowsByIdsForUser.mockResolvedValue([]);
		finder.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
		const projects = mock<ProjectScopeService>();
		projects.getProjectIds.mockResolvedValue(null);
		const service = new AgentImportBindings(agents, workflows, finder, projects);
		const item: AgentPlanItem = {
			name: 'Reviewer',
			availableInMCP: false,
			isArchived: false,
			archiveTransition: null,
			tools: {},
			tasks: {},
			metadata: { versionId: null, publishedVersionId: null },
			publishingAction: 'noop',
			channels: [],
			action: 'create',
			sourceAgentId: 'agent',
			existing: null,
			config: {
				name: 'Reviewer',
				model: 'anthropic/test',
				instructions: 'Review tool calls.',
				hitlConfigurations: [
					{
						id: 'interaction_review',
						name: 'Review',
						method: 'workflow',
						workflowId: 'source-workflow',
					},
				],
			},
		};
		const scope: AgentImportBindingScope = {
			input: { context: { user: mock(), projectId: 'destination' } },
			agentPlan: { items: [item], issues: [] },
			workflowPlan: {
				items: [
					mock<WorkflowImportPlan['items'][number]>({
						action: 'create',
						sourceWorkflowId: 'source-workflow',
						decidedId: 'target-workflow',
					}),
				],
			},
			credentialPlan: { successes: new Map(), stubIds: new Map() },
		};
		const plan = (await service.resolve([scope])).get(scope);
		expect(plan?.issues).toEqual([]);
		expect(plan?.items[0].config?.hitlConfigurations).toEqual([
			{
				id: 'interaction_review',
				name: 'Review',
				method: 'workflow',
				workflowId: 'target-workflow',
			},
		]);
		expect(item.config?.hitlConfigurations?.[0]).toHaveProperty('workflowId', 'source-workflow');
	});
});
