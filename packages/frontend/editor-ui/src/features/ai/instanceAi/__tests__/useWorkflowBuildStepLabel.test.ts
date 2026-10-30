import { useWorkflowBuildStepLabel } from '../composables/useWorkflowBuildStepLabel';
import type { WorkflowBuildStep } from '../instanceAi.workflowStaging';

const nodeTypeName = (nodeType: string) =>
	({ 'n8n-nodes-base.slack': 'Slack', 'n8n-nodes-base.gmail': 'Gmail' })[nodeType];

function label(step: WorkflowBuildStep, issueCount = 0) {
	return useWorkflowBuildStepLabel()(step, { nodeTypeName, issueCount });
}

describe('useWorkflowBuildStepLabel', () => {
	it('lists the search queries', () => {
		expect(label({ kind: 'searching', queries: ['gmail', 'slack'] })).toBe(
			'Searching for gmail, slack',
		);
	});

	it('shortens a long list', () => {
		expect(label({ kind: 'searching', queries: ['a', 'b', 'c', 'd', 'e'] })).toBe(
			'Searching for a, b, c and 2 more',
		);
	});

	it('names the referenced skill, or the skill file', () => {
		expect(label({ kind: 'referencing', skill: 'data-table-manager' })).toBe(
			'Referencing data table manager',
		);
		expect(
			label({ kind: 'referencing', skill: 'workflow-builder', filePath: 'references/aiAgents.md' }),
		).toBe('Referencing ai agents');
	});

	it('lists the node types by their display names, without duplicates', () => {
		expect(
			label({
				kind: 'reading',
				nodeTypes: ['n8n-nodes-base.slack', 'n8n-nodes-base.gmail', 'n8n-nodes-base.slack'],
			}),
		).toBe('Reading Slack, Gmail');
	});

	it('falls back to the node type id for an unknown type', () => {
		expect(label({ kind: 'reading', nodeTypes: ['acme.thing'] })).toBe('Reading acme.thing');
	});

	it('counts the issues the agent fixes', () => {
		expect(label({ kind: 'fixing' }, 2)).toBe('Fixing 2 issues');
		expect(label({ kind: 'fixing' }, 1)).toBe('Fixing 1 issue');
		expect(label({ kind: 'fixing' })).toBe('Fixing issues');
	});

	it.each<[WorkflowBuildStep, string]>([
		[{ kind: 'preparing' }, 'Preparing'],
		[{ kind: 'writing' }, 'Writing the workflow'],
		[{ kind: 'building' }, 'Building'],
		[{ kind: 'searching', queries: [] }, 'Preparing'],
	])('labels %o as %s', (step, text) => {
		expect(label(step)).toBe(text);
	});
});
