// Experiment cleanup (124_workflow_previews_above_assistant)
import type { BaseTextKey } from '@n8n/i18n';

import { getPreviewFileIcon } from './icons';
import type { WorkflowPreviewExample, WorkflowPreviewNode } from './types';

export interface WorkflowPreviewStages {
	trigger: WorkflowPreviewNode[];
	steps: WorkflowPreviewNode[];
	outcomes: WorkflowPreviewNode[];
}

/** Apps that need an account. Built-in nodes (If, Wait, ...) are not listed. */
export const APP_NAME_KEYS: Record<string, BaseTextKey> = {
	anthropic: 'experiments.workflowPreviewsAboveAssistant.apps.anthropic',
	firecrawl: 'experiments.workflowPreviewsAboveAssistant.apps.firecrawl',
	gemini: 'experiments.workflowPreviewsAboveAssistant.apps.gemini',
	gmail: 'experiments.workflowPreviewsAboveAssistant.apps.gmail',
	'google-calendar': 'experiments.workflowPreviewsAboveAssistant.apps.googleCalendar',
	'google-sheets': 'experiments.workflowPreviewsAboveAssistant.apps.googleSheets',
	hubspot: 'experiments.workflowPreviewsAboveAssistant.apps.hubspot',
	lemlist: 'experiments.workflowPreviewsAboveAssistant.apps.lemlist',
	linkedin: 'experiments.workflowPreviewsAboveAssistant.apps.linkedin',
	pipedrive: 'experiments.workflowPreviewsAboveAssistant.apps.pipedrive',
	reddit: 'experiments.workflowPreviewsAboveAssistant.apps.reddit',
	salesforce: 'experiments.workflowPreviewsAboveAssistant.apps.salesforce',
	slack: 'experiments.workflowPreviewsAboveAssistant.apps.slack',
	x: 'experiments.workflowPreviewsAboveAssistant.apps.x',
};

/** Splits the graph into the nodes that start it, the middle, and the end nodes. */
export function getExampleStages(example: WorkflowPreviewExample): WorkflowPreviewStages {
	const targets = new Set(example.connections.map((connection) => connection.target));
	const sources = new Set(example.connections.map((connection) => connection.source));
	const stages: WorkflowPreviewStages = { trigger: [], steps: [], outcomes: [] };

	for (const node of example.nodes) {
		if (!targets.has(node.id)) stages.trigger.push(node);
		else if (!sources.has(node.id)) stages.outcomes.push(node);
		else stages.steps.push(node);
	}

	return stages;
}

/** Unique app icon keys in graph order. */
export function getExampleApps(example: WorkflowPreviewExample): string[] {
	const apps = example.nodes
		.map((node) => node.icon)
		.filter((icon) => getPreviewFileIcon(icon) !== undefined && icon in APP_NAME_KEYS);
	return [...new Set(apps)];
}
