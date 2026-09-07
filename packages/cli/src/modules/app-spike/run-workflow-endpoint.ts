/**
 * SPIKE (hackweek/n8nable-app-spike): the real transport `@n8n/app-sdk` calls
 * through — `POST /apps/:namespace/api/run`. This is what "PageContext" (the
 * $workflows/$dataTables capability from the earlier design pass) actually
 * is on the wire in the committed sandbox/Instance-AI-artifact direction:
 * generated app code makes a plain HTTP request, not an in-process call.
 *
 * Reuses the exact mechanism Agents already use to call a "workflow tool" —
 * `executeWorkflow()` from the agents module, which runs the workflow via
 * `WorkflowRunner` starting from its `Execute Workflow Trigger` node and
 * waits for the result. No webhook involved, unlike the first spike's
 * shortcut.
 *
 * SPIKE SCOPE: bindings are an in-memory Map (appId/namespace -> allowed
 * workflow ids), not the real AppBinding entity from plan.md Phase 0. No
 * auth/token — see plan.md Phase 4/6 for what's real here.
 */
import type { Application, Request, Response } from 'express';
import { Container } from '@n8n/di';
import { WorkflowRepository } from '@n8n/db';

import { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { WorkflowRunner } from '@/workflow-runner';
import { OwnershipService } from '@/services/ownership.service';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';
import {
	detectTriggerNode,
	executeWorkflow,
	type WorkflowToolRunContext,
} from '@/modules/agents/tools/workflow-tool-factory';

/** SPIKE: appId/namespace -> allowed workflow ids. Real version is the
 *  AppBinding entity + a project-scoped CRUD surface (plan.md Phase 0). */
const spikeBindings = new Map<string, Set<string>>();

export function bindWorkflowForSpike(namespace: string, workflowId: string): void {
	const set = spikeBindings.get(namespace) ?? new Set<string>();
	set.add(workflowId);
	spikeBindings.set(namespace, set);
}

export function registerAppRunEndpoint(app: Application): void {
	app.post('/apps/:namespace/api/run', (req: Request, res: Response) => {
		void handleRun(req, res);
	});
	// Convenience for the spike only — the real bindings CRUD lives in
	// packages/cli/src/modules/apps/ (plan.md Phase 0), not here.
	app.post('/apps/:namespace/api/bind', (req: Request, res: Response) => {
		const { namespace } = req.params;
		const { workflowId } = req.body as { workflowId?: string };
		if (!workflowId) {
			res.status(400).json({ error: 'workflowId required' });
			return;
		}
		bindWorkflowForSpike(namespace, workflowId);
		res.json({ success: true, namespace, workflowId });
	});
}

async function handleRun(req: Request, res: Response): Promise<void> {
	const { namespace } = req.params;
	const { workflowId, input } = req.body as {
		workflowId?: string;
		input?: Record<string, unknown>;
	};

	if (!workflowId) {
		res.status(400).json({ error: 'workflowId required' });
		return;
	}

	// The one thing this endpoint exists to prove: an unbound workflow id is
	// rejected, regardless of whether it's a "data" or "action" call — this
	// is the App-level allow-list from plan.md fact-20, not per-call trust.
	const bound = spikeBindings.get(namespace);
	if (!bound?.has(workflowId)) {
		res.status(403).json({ error: `Workflow ${workflowId} is not bound to app "${namespace}"` });
		return;
	}

	try {
		const workflowRepository = Container.get(WorkflowRepository);
		const workflow = await workflowRepository.findById(workflowId);
		if (!workflow) {
			res.status(404).json({ error: `Workflow ${workflowId} not found` });
			return;
		}

		const { node: triggerNode } = detectTriggerNode(workflow);
		const { projectId } = await getWorkflowProjectDetailsSafe(
			Container.get(OwnershipService),
			workflow.id,
		);

		const context: WorkflowToolRunContext = {
			workflowLoader: { load: async () => workflow } as never,
			workflowRunner: Container.get(WorkflowRunner),
			subworkflowPolicyChecker: Container.get(SubworkflowPolicyChecker),
			activeExecutions: Container.get(ActiveExecutions),
			projectId: projectId ?? '',
			executionMode: 'integrated',
		};

		const result = await executeWorkflow(workflow, triggerNode, input ?? {}, context);
		res.json({ success: true, data: result.data });
	} catch (error) {
		res
			.status(500)
			.json({ success: false, error: error instanceof Error ? error.message : String(error) });
	}
}
