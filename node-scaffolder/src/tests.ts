import type { WriteBoundary } from './boundary.js';
import { toPascalCase } from './parse-spec.js';
import type { NodeSpec } from './types.js';

export function generateTests(boundary: WriteBoundary, spec: NodeSpec): void {
	const folderName = toPascalCase(spec.displayName);
	const firstResource = spec.resources[0];
	const firstOp = firstResource?.operations[0];

	boundary.writeAllowed(
		`test/${folderName}.test.ts`,
		`import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Test ${spec.displayName} Node', () => {
	new NodeTestHarness().setupTests();
});
`,
	);

	// Minimal workflow fixture — pinData empty until registered + nock'd.
	// Harness requires pinData key; document in NODE_CARD that real assertions need registration.
	const workflow = {
		name: `${spec.displayName} scaffold smoke`,
		nodes: [
			{
				parameters: {},
				id: '00000000-0000-0000-0000-000000000001',
				name: 'When clicking ‘Execute workflow’',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				parameters: {
					resource: firstResource?.value ?? 'item',
					operation: firstOp?.value ?? 'getAll',
				},
				id: '00000000-0000-0000-0000-000000000002',
				name: spec.displayName,
				type: `n8n-nodes-base.${spec.name}`,
				typeVersion: 1,
				position: [220, 0],
				credentials: {},
			},
		],
		connections: {
			'When clicking ‘Execute workflow’': {
				main: [[{ node: spec.displayName, type: 'main', index: 0 }]],
			},
		},
		pinData: {
			[spec.displayName]: [
				{
					json: {
						scaffolded: true,
						note: 'Replace pinData after registering the node and mocking the API with nock.',
					},
				},
			],
		},
		meta: {
			templateCredsSetupCompleted: true,
		},
	};

	boundary.writeAllowed(
		`test/workflow.${firstOp?.value ?? 'getAll'}.json`,
		`${JSON.stringify(workflow, null, '\t')}\n`,
	);
}
