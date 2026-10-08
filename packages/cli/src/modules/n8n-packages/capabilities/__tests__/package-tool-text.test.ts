import type { ImportedWorkflowPackage } from '../import-summary';
import { describeExport, describeImport } from '../package-tool-text';

const imported = (overrides: Partial<ImportedWorkflowPackage> = {}): ImportedWorkflowPackage => ({
	workflowId: 'wf-local',
	workflowName: 'Daily report',
	created: true,
	published: false,
	credentialsNeedingSetup: [],
	missingNodeTypes: [],
	warnings: [],
	...overrides,
});

describe('describeExport', () => {
	const exported = {
		workflowName: 'Daily report',
		sizeBytes: 2048,
		requirements: {
			nodeTypes: ['n8n-nodes-base.httpRequest@4.2', 'n8n-nodes-base.set@3.4'],
			credentials: [{ name: 'Stripe API', type: 'httpHeaderAuth' }],
		},
		warnings: [],
	};

	it('gives the size, the requirements and where the package is', () => {
		expect(describeExport(exported)).toBe(
			'Exported "Daily report" as a package of 2KB. It needs 1 credential(s) and 2 node type(s). The package is in packageBase64 of the structured content.',
		);
	});

	it('adds each warning at the end', () => {
		const text = describeExport({
			...exported,
			warnings: ['The error workflow "wf-err" is not in the package.', 'Second warning.'],
		});

		expect(text).toBe(
			'Exported "Daily report" as a package of 2KB. It needs 1 credential(s) and 2 node type(s). The package is in packageBase64 of the structured content. The error workflow "wf-err" is not in the package. Second warning.',
		);
	});
});

describe('describeImport', () => {
	it('reports a new workflow that needs nothing more', () => {
		expect(describeImport(imported())).toBe('Created workflow "Daily report" (wf-local).');
	});

	it('reports an update of the workflow that an earlier import created', () => {
		expect(describeImport(imported({ created: false }))).toBe(
			'Updated workflow "Daily report" (wf-local).',
		);
	});

	it('names the credentials without a value that the user must set up', () => {
		const text = describeImport(
			imported({
				credentialsNeedingSetup: [
					{ name: 'Stripe API', type: 'httpHeaderAuth', id: 'c-1' },
					{ name: 'Slack', type: 'slackApi', id: 'c-2' },
				],
			}),
		);

		expect(text).toBe(
			'Created workflow "Daily report" (wf-local). The workflow uses 2 credential(s) without a value. Set them up before the workflow runs: Stripe API (httpHeaderAuth), Slack (slackApi).',
		);
	});

	it('names the node types that this instance does not have', () => {
		const text = describeImport(
			imported({ missingNodeTypes: ['acme.node@1', 'community.node@2'] }),
		);

		expect(text).toBe(
			'Created workflow "Daily report" (wf-local). This instance does not have 2 node type(s) that the workflow uses: acme.node@1, community.node@2. Install them before you publish the workflow.',
		);
	});

	it('gives credentials, node types and warnings in this order and skips empty warnings', () => {
		const text = describeImport(
			imported({
				created: false,
				credentialsNeedingSetup: [{ name: 'Mail', type: 'smtp', id: 'c-3' }],
				missingNodeTypes: ['acme.node@1'],
				warnings: ['', 'The import did not add 1 tag(s).'],
			}),
		);

		expect(text).toBe(
			'Updated workflow "Daily report" (wf-local). The workflow uses 1 credential(s) without a value. Set them up before the workflow runs: Mail (smtp). This instance does not have 1 node type(s) that the workflow uses: acme.node@1. Install them before you publish the workflow. The import did not add 1 tag(s).',
		);
	});
});
