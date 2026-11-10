import { ProjectScopeService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { AgentImportBindings, type AgentImportBindingScope } from '../agent-import-bindings';
import { AgentImportMatchService } from '../agent-import-match.service';
import type { AgentPlanItem } from '../agent-import.types';
import { WorkflowImportMatchService } from '../../workflow/workflow-import-match.service';
import type { WorkflowImportPlan } from '../../workflow/workflow-import.types';

it('remaps the decision workflow and preserves interaction identity during import planning', async () => {
	const agents = mock<AgentImportMatchService>();
	agents.findBySourceAgentIds.mockResolvedValue(new Map());
	agents.findTaskIdConflicts.mockResolvedValue([]);
	const workflows = mock<WorkflowImportMatchService>();
	workflows.findBySourceWorkflowIds.mockResolvedValue({ matches: new Map(), lineageConflicts: [] });
	const finder = mock<WorkflowFinderService>();
	finder.findWorkflowsByIdsForUser.mockResolvedValue([]);
	finder.findWorkflowIdsWithScopeForUser.mockResolvedValue([]);
	const projects = mock<ProjectScopeService>();
	projects.getProjectIds.mockResolvedValue(null);
	const service = new AgentImportBindings(agents, workflows, finder, projects);
	const item: AgentPlanItem = {
		name: 'Reviewer',
		availableInMCP: false,
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
		{ id: 'interaction_review', name: 'Review', method: 'workflow', workflowId: 'target-workflow' },
	]);
	expect(item.config?.hitlConfigurations?.[0]).toHaveProperty('workflowId', 'source-workflow');
});
