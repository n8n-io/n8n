import { NOT_AFFECTED_INSTANCE, reportAffectedNodes } from '../detection-report';
import { createNode } from './test-helpers';

describe('NOT_AFFECTED_INSTANCE', () => {
	it('reports an unaffected instance with no issues and no recommendations', () => {
		expect(NOT_AFFECTED_INSTANCE).toEqual({
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		});
	});
});

describe('reportAffectedNodes', () => {
	it('reports an unaffected workflow for no nodes', () => {
		const toIssue = vi.fn();

		expect(reportAffectedNodes([], toIssue)).toEqual({ isAffected: false, issues: [] });
		expect(toIssue).not.toHaveBeenCalled();
	});

	it('adds the node identity to the issue of every affected node', () => {
		const set = createNode('Set', 'n8n-nodes-base.set');
		const code = createNode('Code', 'n8n-nodes-base.code');

		const report = reportAffectedNodes([set, code], (node) => ({
			title: `Node '${node.name}' is affected`,
			description: 'Some description',
			level: 'warning',
		}));

		expect(report).toEqual({
			isAffected: true,
			issues: [
				{
					title: "Node 'Set' is affected",
					description: 'Some description',
					level: 'warning',
					nodeId: 'node-Set',
					nodeName: 'Set',
				},
				{
					title: "Node 'Code' is affected",
					description: 'Some description',
					level: 'warning',
					nodeId: 'node-Code',
					nodeName: 'Code',
				},
			],
		});
	});
});
