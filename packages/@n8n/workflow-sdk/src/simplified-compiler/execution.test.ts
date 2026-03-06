import type { INode } from 'n8n-workflow';
import { transpileWorkflowJS } from './compiler';
import { parseWorkflowCode } from '../codegen/parse-workflow-code';
import { loadFixtures } from './fixture-loader';
import { resolveImports, executeWorkflow, extractPinData } from './execution-utils';

// ---------------------------------------------------------------------------
// Skip map: fixtures that fail execution (grouped by root cause)
// ---------------------------------------------------------------------------

const SKIP_REASONS: Record<string, string> = {
	// Code node refs upstream node without pin data → undefined.ok
	w04: 'Code node refs upstream without pin data (undefined.ok)',
	w05: 'Code node refs upstream without pin data (undefined.ok)',
	w08: 'Code node refs upstream without pin data (undefined.ok)',
	w10: 'Code node refs upstream without pin data (undefined.ok)',
	w11: 'Code node refs upstream without pin data (undefined.ok)',
	w12: 'Code node refs upstream without pin data (undefined.ok)',
	w17: 'Code node refs upstream without pin data (undefined.ok)',
	w23: 'Code node refs upstream without pin data (undefined.ok)',
	w26: 'Code node refs upstream without pin data (undefined.ok)',
	w27: 'Code node refs upstream without pin data (undefined.ok)',

	// IF/Switch node gets undefined input (missing pin data on predecessor)
	w06: 'IF node gets undefined input (missing pin data on predecessor)',
	w09: 'IF node gets undefined input (missing pin data on predecessor)',
	w14: 'Switch node gets undefined input (missing pin data on predecessor)',

	// Execute Workflow node — additionalData.executionWaitTill missing
	w15: 'Execute Workflow node — additionalData.executionWaitTill missing',
	w18: 'Execute Workflow node — additionalData.executionWaitTill missing',
	w19: 'Execute Workflow node — additionalData.executionWaitTill missing',
	w20: 'Execute Workflow node — additionalData.executionWaitTill missing',
	w21: 'Execute Workflow node — additionalData.executionWaitTill missing',
	w22: 'Execute Workflow node — additionalData.executionWaitTill missing',

	// HTTP node with credentials — credentialsHelper stub unsupported
	w07: 'HTTP node with credentials — credentialsHelper stub unsupported',

	// Expression in URL not resolved — pin data needed on the HTTP node
	w25: 'Expression in URL not resolved — missing pin data on HTTP node',
};

function getSkipReason(dir: string): string | undefined {
	// Extract the w## prefix from dir name like "w04-telegram-voice-transcription"
	const prefix = dir.match(/^(w\d+)/)?.[1];
	return prefix ? SKIP_REASONS[prefix] : undefined;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Fixture execution with pin data', () => {
	beforeAll(async () => {
		await resolveImports();
	}, 120_000);

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		const skipReason = fixture.skip ?? getSkipReason(fixture.dir);
		const testFn = skipReason ? it.skip : it;

		testFn(`${fixture.title} [execution]`, async () => {
			// Step 1: Compile simplified JS → SDK
			const sdk = transpileWorkflowJS(fixture.input);
			expect(sdk.errors).toHaveLength(0);

			// Step 2: Parse SDK → WorkflowJSON
			const workflowJson = parseWorkflowCode(sdk.code);

			// Step 3: Extract pin data
			const pinData = extractPinData(workflowJson);

			// Step 4: Execute with pin data
			const result = await executeWorkflow(
				{
					name: fixture.dir,
					nodes: workflowJson.nodes as unknown as INode[],
					connections: workflowJson.connections,
				},
				pinData,
			);

			expect(result.success).toBe(true);
		});
	}
});
