/**
 * Workflow tests tool — read, save and run the `@n8n/test` Vitest file of a
 * workflow. The `workflow-tests` skill describes how to write the file.
 */
import { Tool } from '@n8n/agents';
import type { WorkflowTestRunResult } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { WORKFLOW_TESTS_TOOL_ID } from './tool-ids';

export { WORKFLOW_TESTS_TOOL_ID };

const getAction = z.object({
	action: z
		.literal('get')
		.describe('Read the stored test file of a workflow, with the result of its last run'),
	workflowId: z.string().min(1),
});

const saveAction = z.object({
	action: z
		.literal('save')
		.describe(
			'Save the test file of a workflow. This replaces the whole file: keep the tests that are already in it unless the user asked to remove them.',
		),
	workflowId: z.string().min(1),
	source: z
		.string()
		.min(1)
		.describe('The complete TypeScript source of the Vitest file, written with @n8n/test'),
});

const runAction = z.object({
	action: z
		.literal('run')
		.describe(
			'Run the stored test file against the saved draft of the workflow. Save the file first. Takes a few seconds.',
		),
	workflowId: z.string().min(1),
});

const allActions = [getAction, saveAction, runAction] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

const UNAVAILABLE = { error: 'Workflow tests are not available on this instance.' } as const;

/** Keeps the tool result short: the agent needs the failures, not the timings of passing tests. */
function summarizeRun(result: WorkflowTestRunResult) {
	const count = (status: string) => result.tests.filter((test) => test.status === status).length;
	return {
		status: result.status,
		passed: count('passed'),
		failed: count('failed'),
		skipped: count('skipped'),
		errors: result.errors,
		tests: result.tests.map(({ name, status, error }) => ({
			name,
			status,
			...(error ? { error } : {}),
		})),
	};
}

export function createWorkflowTestsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(WORKFLOW_TESTS_TOOL_ID)
		.description(
			'Read, save and run the test file of a workflow. A workflow has one Vitest file that uses the ' +
				'@n8n/test library: it loads the workflow, mocks nodes, executes it, and asserts on the result. ' +
				'Load the workflow-tests skill before you write or change a test file.',
		)
		.input(inputSchema)
		.handler(async (input: FullInput) => {
			const service = context.workflowTestService;
			if (!service) return UNAVAILABLE;

			try {
				switch (input.action) {
					case 'get': {
						const file = await service.get(input.workflowId);
						if (!file) return { file: null, note: 'The workflow has no test file yet.' };
						const { lastRun, ...rest } = file;
						return { file: rest, lastRun: lastRun ? summarizeRun(lastRun) : null };
					}
					case 'save': {
						await context.assertInThreadProject?.({ kind: 'workflow', id: input.workflowId });
						const file = await service.save(input.workflowId, input.source);
						return { saved: true, id: file.id, updatedAt: file.updatedAt };
					}
					case 'run':
						return summarizeRun(await service.run(input.workflowId));
					default:
						return { error: 'Unknown workflow-tests action' };
				}
			} catch (error) {
				return { error: getErrorMessage(error) };
			}
		})
		.build();
}
