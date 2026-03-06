import { writeFileSync } from 'fs';
import { join } from 'path';
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

	// Compiler emits {{dynamic URL}} for concatenated URL expressions — can't resolve at runtime
	w25: 'Compiler emits {{dynamic URL}} for concatenated URL expressions',

	// Sub-workflow (loop body / sub-function) — executionWaitTill missing
	w26: 'Execute Workflow node in loop — additionalData.executionWaitTill missing',
	w27: 'Execute Workflow node in loop — additionalData.executionWaitTill missing',
};

function getSkipReason(dir: string): string | undefined {
	// Extract the w## prefix from dir name like "w04-telegram-voice-transcription"
	const prefix = dir.match(/^(w\d+)/)?.[1];
	return prefix ? SKIP_REASONS[prefix] : undefined;
}

// ---------------------------------------------------------------------------
// Execution data collection (written to execution-data.json after all tests)
// ---------------------------------------------------------------------------

interface FixtureExecutionEntry {
	status: 'pass' | 'error' | 'skip';
	error?: string;
	reason?: string;
	executedNodes?: string[];
	nodeOutputs?: Record<string, unknown[]>;
}

const executionData: Record<string, FixtureExecutionEntry> = {};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Fixture execution with pin data', () => {
	beforeAll(async () => {
		await resolveImports();
	}, 120_000);

	afterAll(() => {
		writeFileSync(
			join(__dirname, '__fixtures__', 'execution-data.json'),
			JSON.stringify(executionData, null, 2) + '\n',
		);
	});

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		const skipReason = fixture.skip ?? getSkipReason(fixture.dir);

		if (skipReason) {
			executionData[fixture.dir] = { status: 'skip', reason: skipReason };
			it.skip(`${fixture.title} [execution]`, () => {});
			continue;
		}

		it(`${fixture.title} [execution]`, async () => {
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

			// Step 5: Collect per-node output data
			const nodeOutputs: Record<string, unknown[]> = {};
			const runData = result.run?.data?.resultData?.runData;
			if (runData) {
				for (const [nodeName, taskDataArr] of Object.entries(runData)) {
					const items = taskDataArr[0]?.data?.main?.[0];
					if (items) {
						nodeOutputs[nodeName] = items.map((item) => item.json);
					}
				}
			}

			executionData[fixture.dir] = {
				status: result.success ? 'pass' : 'error',
				error: result.error,
				executedNodes: result.executedNodes,
				nodeOutputs,
			};

			expect(result.success).toBe(true);
		});
	}
});
