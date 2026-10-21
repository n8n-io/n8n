// Experiment cleanup (124_workflow_previews_above_assistant)
import type { BaseTextKey } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import { getExampleApps, getExampleStages } from './catalogDetails';
import type { WorkflowPreviewExample, WorkflowPreviewNode } from './types';

const TEXT_KEY: BaseTextKey =
	'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.title';

function node(id: string, icon: string): WorkflowPreviewNode {
	return { id, labelKey: TEXT_KEY, icon, position: { x: 0, y: 0 } };
}

function createExample(
	nodes: WorkflowPreviewNode[],
	connections: WorkflowPreviewExample['connections'],
): WorkflowPreviewExample {
	return {
		id: 'example',
		titleKey: TEXT_KEY,
		promptKey: TEXT_KEY,
		start: 'event',
		nodes,
		connections,
		card: { quoteKey: TEXT_KEY },
	};
}

const ids = (nodes: WorkflowPreviewNode[]) => nodes.map((n) => n.id);

describe('getExampleStages', () => {
	it('splits a linear graph into start, middle and end', () => {
		const stages = getExampleStages(
			createExample(
				[node('a', 'gmail'), node('b', 'filter'), node('c', 'slack')],
				[
					{ source: 'a', target: 'b' },
					{ source: 'b', target: 'c' },
				],
			),
		);

		expect(ids(stages.trigger)).toEqual(['a']);
		expect(ids(stages.steps)).toEqual(['b']);
		expect(ids(stages.outcomes)).toEqual(['c']);
	});

	it('lists every branch end as an outcome', () => {
		const stages = getExampleStages(
			createExample(
				[node('a', 'gmail'), node('b', 'if'), node('c', 'slack'), node('d', 'google-sheets')],
				[
					{ source: 'a', target: 'b' },
					{ source: 'b', target: 'c' },
					{ source: 'b', target: 'd' },
				],
			),
		);

		expect(ids(stages.steps)).toEqual(['b']);
		expect(ids(stages.outcomes)).toEqual(['c', 'd']);
	});
});

describe('getExampleApps', () => {
	it('returns each app once in graph order and skips built-in nodes', () => {
		const apps = getExampleApps(
			createExample(
				[
					node('a', 'gmail'),
					node('b', 'if'),
					node('c', 'wait'),
					node('d', 'gmail'),
					node('e', 'slack'),
				],
				[],
			),
		);

		expect(apps).toEqual(['gmail', 'slack']);
	});
});
