import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createBuildWorkflowTool } from '../build-workflow.tool';

vi.mock('../resolve-credentials', () => ({
	buildCredentialMap: vi.fn(async () => await Promise.resolve(new Map())),
	buildCredentialResolutionNote: vi.fn(() => undefined),
	isN8nCreditsWalletDepleted: vi.fn(async () => await Promise.resolve(false)),
	resolveCredentials: vi.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				heldForNewCredentialTypes: [],
				resolvedCredentialsByNode: {},
			}),
	),
}));

vi.mock('../setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn(async () => await Promise.resolve([])),
	getValidCredentialTypes: vi.fn(async () => new Set<string>()),
	stripStaleCredentialsFromWorkflow: vi.fn(async () => await Promise.resolve()),
}));

vi.mock('../classify-node-destructiveness.service', () => ({
	classifyNodesForSimulation: vi.fn(async () => await Promise.resolve([])),
}));

vi.mock('../generate-simulation-fixtures.service', async (importOriginal) => ({
	...(await importOriginal<object>()),
	generateSimulationFixtures: vi.fn(async () => await Promise.resolve({})),
}));

const contractSource = `import { workflow, trigger, action } from '@n8n/workflow-sdk';

const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const shape = action('set.fields', {
	name: 'Shape',
	parameters: { fields: [{ name: 'email', value: 'a@example.com', type: 'string' }] },
});

export default workflow('host-build', 'Host build').add(start).to(shape);
`;

function makeContext() {
	const createFromWorkflowJSON = vi.fn(
		async (_json: WorkflowJSON) =>
			await Promise.resolve({ id: 'wf-1', versionId: 'v-1', activeVersionId: null }),
	);
	const context = {
		userId: 'user-1',
		runId: 'run-1',
		nodeContractsEnabled: true,
		workflowService: { createFromWorkflowJSON },
		credentialService: {},
		nodeService: {},
		dataTableService: {},
		executionService: {},
		permissions: { createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
		trackTelemetry: vi.fn(),
		logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
	} as unknown as InstanceAiContext;
	return { context, createFromWorkflowJSON };
}

type BuildResult = { success: boolean; workflowId?: string; errors?: string[] };

describe('build-workflow with node contracts enabled', () => {
	it('builds inline sourceCode on the host without a workspace and saves compiled contract params', async () => {
		const { context, createFromWorkflowJSON } = makeContext();

		const result = await executeTool<BuildResult>(createBuildWorkflowTool(context), {
			filePath: 'src/workflows/main.workflow.ts',
			sourceCode: contractSource,
		});

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		const saved = createFromWorkflowJSON.mock.calls[0][0];
		expect(saved.nodes.find((node) => node.name === 'Shape')).toMatchObject({
			type: 'n8n-nodes-base.set',
			typeVersion: 3.5,
			parameters: {
				mode: 'manual',
				assignments: {
					assignments: [
						{ id: 'assignment-0', name: 'email', value: 'a@example.com', type: 'string' },
					],
				},
				includeOtherFields: false,
			},
		});
	});

	it('returns a build error for source the interpreter cannot parse', async () => {
		const { context, createFromWorkflowJSON } = makeContext();

		const result = await executeTool<BuildResult>(createBuildWorkflowTool(context), {
			filePath: 'src/workflows/main.workflow.ts',
			sourceCode: "export default workflow('broken', 'Broken').add(",
		});

		expect(result.success).toBe(false);
		expect(result.errors?.join('\n')).toContain('Failed to parse workflow code');
		expect(createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns a build error for a contract node that breaks its contract', async () => {
		const { context, createFromWorkflowJSON } = makeContext();

		const result = await executeTool<BuildResult>(createBuildWorkflowTool(context), {
			filePath: 'src/workflows/main.workflow.ts',
			sourceCode: contractSource.replace(
				"fields: [{ name: 'email', value: 'a@example.com', type: 'string' }]",
				'fields: []',
			),
		});

		expect(result.success).toBe(false);
		expect(result.errors?.join('\n')).toContain('CONTRACT_INPUT_INVALID');
		expect(createFromWorkflowJSON).not.toHaveBeenCalled();
	});
});
