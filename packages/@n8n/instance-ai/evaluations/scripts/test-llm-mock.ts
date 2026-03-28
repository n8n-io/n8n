/**
 * Quick smoke test for the eval LLM mock endpoint.
 *
 * Usage:
 *   npx tsx packages/@n8n/instance-ai/evaluations/scripts/test-llm-mock.ts [workflowId]
 *
 * Requires a running n8n instance on http://localhost:5678 with dev credentials.
 * Pass a workflow ID as argument, or it defaults to 98GCfc4fDIvaOj8l
 * (Daily Slack Channel Summarizer).
 */

import { N8nClient } from '../clients/n8n-client';

const BASE_URL = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
const EMAIL = process.env.N8N_EVAL_EMAIL;
const PASSWORD = process.env.N8N_EVAL_PASSWORD;
const WORKFLOW_ID = process.argv[2];

if (!EMAIL || !PASSWORD) {
	console.error('Set N8N_EVAL_EMAIL and N8N_EVAL_PASSWORD environment variables');
	process.exit(1);
}
if (!WORKFLOW_ID) {
	console.error('Usage: test-llm-mock.ts <workflowId> [scenarioHints]');
	process.exit(1);
}

async function main() {
	console.log(`\nTesting eval LLM mock endpoint against ${BASE_URL}`);
	console.log(`Workflow: ${WORKFLOW_ID}\n`);

	const client = new N8nClient(BASE_URL);
	console.log('  Authenticating...');
	await client.login(EMAIL, PASSWORD);
	console.log('  Authenticated\n');

	// Call the eval mock endpoint
	console.log(`  POST /instance-ai/eval/execute-with-llm-mock/${WORKFLOW_ID}`);

	const scenarioHints = process.argv[3];
	if (scenarioHints) {
		console.log(`  Scenario: "${scenarioHints}"\n`);
	}

	const result = await client.executeWithLlmMock(WORKFLOW_ID, scenarioHints);

	// Print summary
	console.log(`\n  Execution: ${result.executionId}`);
	console.log(`  Success: ${result.success}\n`);

	// Show per-node results grouped by execution mode
	for (const [nodeName, data] of Object.entries(result.nodeResults)) {
		const tag = data.executionMode.toUpperCase();
		if (data.interceptedRequests.length > 0) {
			console.log(`  [${tag}] "${nodeName}" — ${data.interceptedRequests.length} request(s):`);
			for (const req of data.interceptedRequests) {
				console.log(`    ${req.method} ${req.url} (${req.nodeType})`);
				if (req.mockResponse) {
					const responseStr = JSON.stringify(req.mockResponse, null, 2);
					const truncated =
						responseStr.length > 500 ? responseStr.slice(0, 500) + '\n    ...' : responseStr;
					console.log(`    Mock response: ${truncated.split('\n').join('\n    ')}`);
				}
			}
		} else if (data.output !== null) {
			console.log(`  [${tag}] "${nodeName}" — produced output`);
		} else {
			console.log(`  [${tag}] "${nodeName}" — no output`);
		}
		if (data.configIssues && Object.keys(data.configIssues).length > 0) {
			for (const [param, messages] of Object.entries(data.configIssues)) {
				console.log(`    ⚠ ${param}: ${(messages as string[]).join(', ')}`);
			}
		}
	}

	if (result.errors.length > 0) {
		console.log('\n  Errors:');
		for (const error of result.errors) {
			console.log(`    - ${error}`);
		}
	}

	// Show Phase 1 hints
	if (result.hints) {
		console.log('\n  Phase 1 Hints:');
		console.log(`    Global context: ${result.hints.globalContext}`);
		console.log(
			`    Trigger content: ${JSON.stringify(result.hints.triggerContent, null, 2).split('\n').join('\n    ')}`,
		);
		for (const [nodeName, hint] of Object.entries(result.hints.nodeHints)) {
			console.log(`    "${nodeName}": ${hint}`);
		}
	}

	console.log();
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\n  Test failed: ${message}`);
	process.exit(1);
});
