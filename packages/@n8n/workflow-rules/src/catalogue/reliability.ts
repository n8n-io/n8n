import { z } from 'zod';

import { getCheckedNodes, getSetting, isExpression } from '../workflow-access';
import { defineCatalogueRule } from './define';

export const errorWorkflowRequired = defineCatalogueRule({
	id: 'error-workflow-required',
	category: 'reliability',
	title: 'Error workflow required',
	description: 'The workflow names an error workflow, so someone hears about failed runs.',
	defaultSeverity: 'warn',
	optionsSchema: z.object({}),
	evaluate(workflow) {
		const value = getSetting(workflow, 'errorWorkflow');
		// Same reading as the server: `DEFAULT` and expressions name no workflow.
		const isSet =
			typeof value === 'string' && value !== '' && value !== 'DEFAULT' && !isExpression(value);
		if (isSet) return [];
		return [{ message: 'Set an error workflow in the workflow settings.', params: {} }];
	},
});

export const executionTimeout = defineCatalogueRule({
	id: 'execution-timeout',
	category: 'reliability',
	title: 'Execution timeout',
	description: 'The workflow stops runs that take too long.',
	defaultSeverity: 'warn',
	optionsSchema: z.object({
		maxSeconds: z.number().int().positive().max(31_536_000).optional(),
	}),
	tightenOptions: (instance, project) => ({
		maxSeconds:
			instance.maxSeconds === undefined || project.maxSeconds === undefined
				? (instance.maxSeconds ?? project.maxSeconds)
				: Math.min(instance.maxSeconds, project.maxSeconds),
	}),
	evaluate(workflow, { maxSeconds }, ctx) {
		const raw = getSetting(workflow, 'executionTimeout');
		const timeout = typeof raw === 'number' ? raw : (ctx.defaults.executionTimeout ?? -1);
		if (timeout <= 0) {
			return [{ message: 'Set an execution timeout in the workflow settings.', params: {} }];
		}
		if (maxSeconds !== undefined && timeout > maxSeconds) {
			return [
				{
					message: `The execution timeout is ${timeout} seconds. Use ${maxSeconds} seconds or less.`,
					params: { timeout: String(timeout), max: String(maxSeconds) },
				},
			];
		}
		return [];
	},
});

export const noDisabledNodes = defineCatalogueRule({
	id: 'no-disabled-nodes',
	category: 'reliability',
	title: 'No disabled nodes',
	description: 'Published workflows do not carry deactivated nodes.',
	defaultSeverity: 'warn',
	optionsSchema: z.object({}),
	evaluate(workflow) {
		return getCheckedNodes(workflow)
			.filter((node) => node.disabled === true)
			.map((node) => ({
				message: `Node "${node.name}" is deactivated. Remove it or turn it on.`,
				params: { node: node.name },
				node,
			}));
	},
});

export const maxNodes = defineCatalogueRule({
	id: 'max-nodes',
	category: 'reliability',
	title: 'Workflow size',
	description: 'Workflows stay small enough to read and maintain.',
	defaultSeverity: 'warn',
	optionsSchema: z.object({ max: z.number().int().min(1).max(10_000).default(50) }),
	tightenOptions: (instance, project) => ({ max: Math.min(instance.max, project.max) }),
	evaluate(workflow, { max }) {
		const count = getCheckedNodes(workflow).length;
		if (count <= max) return [];
		return [
			{
				message: `The workflow has ${count} nodes. Use ${max} or fewer, or move parts into sub-workflows.`,
				params: { count: String(count), max: String(max) },
			},
		];
	},
});
