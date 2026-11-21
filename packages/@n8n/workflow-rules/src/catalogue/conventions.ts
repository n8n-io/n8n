import { z } from 'zod';

import { validateRegexPattern } from '../regex';
import type { RawFinding } from '../types';
import { getCheckedNodes } from '../workflow-access';
import { defineCatalogueRule } from './define';

const namePatternSchema = z.object({
	pattern: z.string().max(500),
	flags: z.string().max(4).default(''),
	/** Shown instead of the raw pattern, for example "Team prefix, like [ops] Sync". */
	hint: z.string().max(200).optional(),
});

export const workflowNamePattern = defineCatalogueRule({
	id: 'workflow-name-pattern',
	category: 'conventions',
	title: 'Workflow naming',
	description: 'Workflow names follow the naming pattern your team agreed on.',
	defaultSeverity: 'warn',
	// A list, so a project can add its own pattern on top of the instance pattern.
	optionsSchema: z.object({ patterns: z.array(namePatternSchema).max(10).default([]) }),
	validate: ({ patterns }) => {
		if (patterns.length === 0) return 'Add a naming pattern';
		for (const { pattern, flags } of patterns) {
			const error = validateRegexPattern(pattern, flags);
			if (error) return error;
		}
		return undefined;
	},
	tightenOptions: (instance, project) => ({
		patterns: [...instance.patterns, ...project.patterns],
	}),
	evaluate(workflow, { patterns }, ctx) {
		const findings: RawFinding[] = [];
		for (const { pattern, flags, hint } of patterns) {
			if (ctx.regex.test(pattern, workflow.name, flags)) continue;
			const expected = hint ?? pattern;
			findings.push({
				message: `The workflow name "${workflow.name}" does not follow the naming pattern: ${expected}.`,
				params: { name: workflow.name, expected },
			});
		}
		return findings;
	},
});

export const nodeNameNotDefault = defineCatalogueRule({
	id: 'node-name-not-default',
	category: 'conventions',
	title: 'Descriptive node names',
	description: 'Nodes have names that say what they do, not the default name.',
	defaultSeverity: 'warn',
	needsNodeTypes: true,
	optionsSchema: z.object({}),
	evaluate(workflow, _options, ctx) {
		const { getDefaultNodeName } = ctx;
		if (!getDefaultNodeName) return [];
		const findings: RawFinding[] = [];
		for (const node of getCheckedNodes(workflow)) {
			const defaultName = getDefaultNodeName(node);
			if (!defaultName || !node.name.startsWith(defaultName)) continue;
			// n8n numbers repeated names: "HTTP Request", "HTTP Request1", "HTTP Request2".
			if (!/^\d*$/.test(node.name.slice(defaultName.length))) continue;
			findings.push({
				message: `Rename node "${node.name}" to say what it does.`,
				params: { node: node.name },
				node,
			});
		}
		return findings;
	},
});
