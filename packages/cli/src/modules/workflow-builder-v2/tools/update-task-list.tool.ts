import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import type { RunStateRegistry } from '../session/run-state-registry';
import type { Task } from '../session/session.types';
import { summarizeWorkflow } from '../utils/workflow-summary';

const taskStatusSchema = z.enum(['pending', 'active', 'done']);

const taskSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	status: taskStatusSchema,
});

const inputSchema = z.object({
	tasks: z.array(taskSchema).min(1),
});

export function createUpdateTaskListTool(registry: RunStateRegistry, sessionId: string): BuiltTool {
	return new Tool('update_task_list')
		.description(
			'Set or update the task list for the workflow being built. Tasks describe the PROBLEMS to solve, not the nodes. Statuses: pending (not started), active (currently working on it), done (committed). Call this at the very start (with all tasks pending), and again to mark a task active before proposing nodes for it, and again to mark it done after the user commits the picked node.',
		)
		.input(inputSchema)
		.handler(async ({ tasks }) => {
			const next: Task[] = tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }));
			registry.update(sessionId, { taskList: next });
			const state = registry.require(sessionId);
			return {
				ok: true,
				count: next.length,
				workflowSummary: summarizeWorkflow(state.workflow),
			};
		})
		.build();
}
