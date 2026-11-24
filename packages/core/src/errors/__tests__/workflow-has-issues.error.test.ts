import type { INode, IWorkflowIssues } from 'n8n-workflow';

import { WorkflowHasIssuesError } from '../workflow-has-issues.error';

describe('WorkflowHasIssuesError', () => {
	it('formats a single node with multiple issues as bulleted lines', () => {
		const issues: IWorkflowIssues = {
			'HTTP Request': {
				parameters: { url: ['Parameter "URL" is required.'] },
				typeUnknown: true,
			},
		};
		const nodes: Record<string, INode> = {
			'HTTP Request': {
				id: '1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters: {},
			},
		};

		expect(new WorkflowHasIssuesError(issues, nodes).message).toBe(
			[
				"The 'HTTP Request' node has issues:",
				'- Parameter "URL" is required.',
				'- Node Type "n8n-nodes-base.httpRequest" is not known.',
			].join('\n'),
		);
	});

	it('lists each node as its own bullet when multiple nodes have issues', () => {
		const issues: IWorkflowIssues = {
			A: { parameters: { x: ['Parameter "x" is required.'] } },
			B: { parameters: { y: ['Parameter "y" is required.'] } },
		};

		expect(new WorkflowHasIssuesError(issues, {}).message).toBe(
			[
				'2 nodes have issues:',
				'- \'A\': Parameter "x" is required.',
				'- \'B\': Parameter "y" is required.',
			].join('\n'),
		);
	});

	it("joins a node's multiple issues with a space within the multi-node format", () => {
		const issues: IWorkflowIssues = {
			A: { parameters: { x: ['Parameter "x" is required.'] } },
			B: {
				parameters: { url: ['Parameter "URL" is required.'] },
				credentials: { httpBasicAuth: ['Credentials for "httpBasicAuth" are not set.'] },
			},
		};

		expect(new WorkflowHasIssuesError(issues, {}).message).toBe(
			[
				'2 nodes have issues:',
				'- \'A\': Parameter "x" is required.',
				'- \'B\': Parameter "URL" is required. Credentials for "httpBasicAuth" are not set.',
			].join('\n'),
		);
	});

	it('caps at 4 nodes and appends a hint for the rest', () => {
		const issues: IWorkflowIssues = {
			A: { parameters: { p: ['Parameter "p" is required.'] } },
			B: { parameters: { p: ['Parameter "p" is required.'] } },
			C: { parameters: { p: ['Parameter "p" is required.'] } },
			D: { parameters: { p: ['Parameter "p" is required.'] } },
			E: { parameters: { p: ['Parameter "p" is required.'] } },
			F: { parameters: { p: ['Parameter "p" is required.'] } },
		};

		expect(new WorkflowHasIssuesError(issues, {}).message).toBe(
			[
				'6 nodes have issues:',
				'- \'A\': Parameter "p" is required.',
				'- \'B\': Parameter "p" is required.',
				'- \'C\': Parameter "p" is required.',
				'- \'D\': Parameter "p" is required.',
				'- (2 more)',
			].join('\n'),
		);
	});
});
