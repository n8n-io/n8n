import type { INode, IWorkflowIssues } from 'n8n-workflow';

import { BASE_MESSAGE, WorkflowHasIssuesError } from '../workflow-has-issues.error';

describe('WorkflowHasIssuesError', () => {
	it('formats a single node with multiple issue types', () => {
		const issues: IWorkflowIssues = {
			'HTTP Request': {
				execution: true,
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
			`${BASE_MESSAGE} Issues: 'HTTP Request': Execution Error. Parameter "URL" is required. Node Type "n8n-nodes-base.httpRequest" is not known.`,
		);
	});

	it('joins multiple nodes with a pipe separator', () => {
		const issues: IWorkflowIssues = {
			A: { parameters: { x: ['Parameter "x" is required.'] } },
			B: { parameters: { y: ['Parameter "y" is required.'] } },
		};

		expect(new WorkflowHasIssuesError(issues, {}).message).toBe(
			`${BASE_MESSAGE} Issues: 'A': Parameter "x" is required. | 'B': Parameter "y" is required.`,
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
			`${BASE_MESSAGE} Issues: 'A': Parameter "p" is required. | 'B': Parameter "p" is required. | 'C': Parameter "p" is required. | 'D': Parameter "p" is required. | (2 more)`,
		);
	});
});
