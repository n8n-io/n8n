import type { INode, IWorkflowIssues } from 'n8n-workflow';

import { WorkflowHasIssuesError } from '../workflow-has-issues.error';

describe('WorkflowHasIssuesError', () => {
	const baseMessage =
		'The workflow has issues and cannot be executed for that reason. Please fix them first.';

	it('uses the base message when no issues are provided', () => {
		expect(new WorkflowHasIssuesError().message).toBe(baseMessage);
	});

	it('uses the base message when the issues map is empty', () => {
		expect(new WorkflowHasIssuesError({}).message).toBe(baseMessage);
	});

	it('includes parameter and credential issues with node names', () => {
		const issues: IWorkflowIssues = {
			'HTTP Request': {
				credentials: { httpBasicAuth: ['Credentials for "httpBasicAuth" are not set.'] },
			},
			Set: {
				parameters: { value: ['Parameter "value" is required.'] },
			},
		};

		const message = new WorkflowHasIssuesError(issues).message;

		expect(message).toContain(baseMessage);
		expect(message).toContain('\'HTTP Request\': Credentials for "httpBasicAuth" are not set.');
		expect(message).toContain('\'Set\': Parameter "value" is required.');
	});

	it('includes the node type in the typeUnknown message when nodes are provided', () => {
		const issues: IWorkflowIssues = {
			Custom: { typeUnknown: true },
		};
		const nodes: Record<string, INode> = {
			Custom: {
				id: '1',
				name: 'Custom',
				type: 'community.custom',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		};

		expect(new WorkflowHasIssuesError(issues, nodes).message).toContain(
			'\'Custom\': Node Type "community.custom" is not known.',
		);
	});

	it('falls back to a generic typeUnknown message when the node is missing', () => {
		const issues: IWorkflowIssues = {
			Custom: { typeUnknown: true },
		};

		expect(new WorkflowHasIssuesError(issues).message).toContain(
			"'Custom': Node Type is not known.",
		);
	});

	it('flattens execution, parameters, credentials, and input issues for one node', () => {
		const issues: IWorkflowIssues = {
			Multi: {
				execution: true,
				parameters: { foo: ['Parameter "foo" is required.'] },
				credentials: { api: ['API credentials missing.'] },
				input: { in: ['Input is invalid.'] },
			},
		};

		const message = new WorkflowHasIssuesError(issues).message;

		expect(message).toContain(
			'\'Multi\': Execution Error.; Parameter "foo" is required.; API credentials missing.; Input is invalid.',
		);
	});

	it('joins multiple nodes with a separator', () => {
		const issues: IWorkflowIssues = {
			A: { parameters: { x: ['Parameter "x" is required.'] } },
			B: { parameters: { y: ['Parameter "y" is required.'] } },
		};

		expect(new WorkflowHasIssuesError(issues).message).toContain(
			'\'A\': Parameter "x" is required. | \'B\': Parameter "y" is required.',
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

		const message = new WorkflowHasIssuesError(issues).message;

		expect(message).toContain("'A':");
		expect(message).toContain("'D':");
		expect(message).not.toContain("'E':");
		expect(message).not.toContain("'F':");
		expect(message).toContain('(2 other issues)');
	});
});
