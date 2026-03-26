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
const EMAIL = process.env.N8N_EVAL_EMAIL ?? 'jose.gonzalez@n8n.io';
const PASSWORD = process.env.N8N_EVAL_PASSWORD ?? 'Fake12345%';
const WORKFLOW_ID = process.argv[2] ?? '98GCfc4fDIvaOj8l';

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

	// Use the client's fetch directly — the endpoint is on the instance-ai controller
	const evalResult = (await (client as any).fetch(
		`/rest/instance-ai/eval/execute-with-llm-mock/${WORKFLOW_ID}`,
		{
			method: 'POST',
			body: {
				...(scenarioHints ? { scenarioHints } : {}),
			},
		},
	)) as { data: Record<string, unknown> };

	const result = evalResult.data as {
		executionId: string;
		success: boolean;
		nodeResults: Record<
			string,
			{
				output: unknown;
				interceptedRequests: Array<{
					url: string;
					method: string;
					headers: Record<string, string>;
					body: unknown;
					nodeType: string;
				}>;
			}
		>;
		errors: string[];
	};

	// Print summary
	console.log(`\n  Execution: ${result.executionId}`);
	console.log(`  Success: ${result.success}\n`);

	// Show intercepted requests per node
	for (const [nodeName, data] of Object.entries(result.nodeResults)) {
		if (data.interceptedRequests.length > 0) {
			console.log(`  [INTERCEPTED] "${nodeName}" — ${data.interceptedRequests.length} request(s):`);
			for (const req of data.interceptedRequests) {
				console.log(`    ${req.method} ${req.url}`);
				console.log(`    type: ${req.nodeType}`);
				if (Object.keys(req.headers).length > 0) {
					console.log(`    headers: ${JSON.stringify(req.headers)}`);
				}
				if (req.body) {
					console.log(`    body: ${JSON.stringify(req.body).slice(0, 300)}`);
				}
				console.log();
			}
		} else if (data.output !== null) {
			console.log(`  [EXECUTED] "${nodeName}" — produced output`);
		} else {
			console.log(`  [NO OUTPUT] "${nodeName}"`);
		}
	}

	if (result.errors.length > 0) {
		console.log('\n  Errors:');
		for (const error of result.errors) {
			console.log(`    - ${error}`);
		}
	}

	console.log();
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\n  Test failed: ${message}`);
	process.exit(1);
});
