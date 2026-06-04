import { jsonParse } from 'n8n-workflow';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { N8nClient } from './clients/n8n-client';
import { MOCK_EXECUTION_VERIFY_PROMPT } from './system-prompts/mock-execution-verify';

type Scenario = {
	name: string;
	description: string;
	dataSetup: string;
	successCriteria: string;
};

type EvalNodeResult = {
	output?: unknown;
	interceptedRequests: Array<{
		url: string;
		method: string;
		requestBody?: unknown;
		mockResponse?: unknown;
	}>;
	executionMode: 'mocked' | 'pinned' | 'real';
	startTime?: number;
	configIssues?: Record<string, string[]>;
	outputCount?: number;
};

type EvalResult = {
	success: boolean;
	nodeResults: Record<string, EvalNodeResult>;
	errors: string[];
	hints: {
		warnings: string[];
		triggerContent: Record<string, unknown>;
	};
};

type WorkflowNode = {
	name?: string;
	type: string;
	typeVersion?: number;
	disabled?: boolean;
	parameters?: Record<string, unknown>;
};

type WorkflowJson = {
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
};

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const instanceAiRoot = path.resolve(__dirname, '..');
const dataDir = path.join(instanceAiRoot, '.data');
const evalResultsPath = path.join(instanceAiRoot, 'eval-results.json');
const reportPath = path.join(dataDir, 'workflow-eval-report.html');
const sqliteDbPath = path.join(repoRoot, '.n8n-instance-ai', '.n8n', 'database.sqlite');

type CliArgs = {
	testCasePath: string;
	scenarioName?: string;
};

function parseCliArgs(argv: string[]): CliArgs {
	let testCasePath: string | undefined;
	let scenarioName: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--test-case':
			case '--slug': {
				const slug = argv[++i];
				if (!slug) throw new Error(`Missing value for ${arg}`);
				testCasePath = path.join(
					instanceAiRoot,
					'evaluations',
					'data',
					'workflows',
					`${slug}.json`,
				);
				break;
			}
			case '--test-case-path': {
				const rawPath = argv[++i];
				if (!rawPath) throw new Error('Missing value for --test-case-path');
				testCasePath = path.resolve(process.cwd(), rawPath);
				break;
			}
			case '--scenario': {
				scenarioName = argv[++i];
				if (!scenarioName) throw new Error('Missing value for --scenario');
				break;
			}
			default:
				if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
				if (!scenarioName) {
					scenarioName = arg;
				} else if (!testCasePath) {
					testCasePath = path.join(
						instanceAiRoot,
						'evaluations',
						'data',
						'workflows',
						`${arg}.json`,
					);
				} else {
					throw new Error(`Unexpected positional argument: ${arg}`);
				}
		}
	}

	return {
		testCasePath:
			testCasePath ??
			path.join(
				instanceAiRoot,
				'evaluations',
				'data',
				'workflows',
				'cross-team-linear-report.json',
			),
		scenarioName,
	};
}

function buildVerificationArtifact(
	scenario: Scenario,
	evalResult: EvalResult,
	workflowJson: WorkflowJson,
): string {
	const sections: string[] = [];

	sections.push(
		'## Scenario',
		'',
		`**Name:** ${scenario.name} — ${scenario.description}`,
		`**Data setup:** ${scenario.dataSetup}`,
		'',
	);

	const preAnalysis: string[] = [];
	if (evalResult.hints.warnings.length > 0) {
		for (const warning of evalResult.hints.warnings) {
			preAnalysis.push(`⚠ FRAMEWORK ISSUE: ${warning}`);
		}
	}
	if (Object.keys(evalResult.hints.triggerContent).length === 0) {
		preAnalysis.push(
			'⚠ FRAMEWORK ISSUE: Trigger content is empty — the start node received no input data. All downstream failures are likely caused by this, not by the workflow builder.',
		);
	}

	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			preAnalysis.push(
				`⚠ BUILDER ISSUE: "${nodeName}" has missing config: ${Object.values(nr.configIssues).flat().join('; ')}`,
			);
		}
		for (const req of nr.interceptedRequests) {
			if (
				typeof req.mockResponse === 'object' &&
				req.mockResponse !== null &&
				'_evalMockError' in (req.mockResponse as Record<string, unknown>)
			) {
				const msg = (req.mockResponse as Record<string, unknown>).message;
				const msgStr = typeof msg === 'string' ? msg : 'unknown';
				preAnalysis.push(
					`⚠ MOCK ISSUE: "${nodeName}" ${req.method} ${req.url} → mock generation failed: ${msgStr}`,
				);
			}
		}
	}

	if (preAnalysis.length > 0) {
		sections.push('## Pre-analysis (automated flags)', '', ...preAnalysis, '');
	}

	const mockedNodes: string[] = [];
	const pinnedNodes: string[] = [];
	const realNodes: string[] = [];
	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.executionMode === 'mocked') mockedNodes.push(nodeName);
		else if (nr.executionMode === 'pinned') pinnedNodes.push(nodeName);
		else realNodes.push(nodeName);
	}

	sections.push(
		'## Execution summary',
		'',
		`**Status:** ${evalResult.success ? 'success' : 'failed'}`,
		`**Mocked nodes** (HTTP intercepted, responses generated by LLM): ${mockedNodes.join(', ') || 'none'}`,
		`**Pinned nodes** (trigger data provided, not executed): ${pinnedNodes.join(', ') || 'none'}`,
		`**Real nodes** (executed with actual logic on mock/pinned data): ${realNodes.join(', ') || 'none'}`,
		'',
	);

	if (evalResult.errors.length > 0) {
		sections.push('## Errors', '', ...evalResult.errors.map((e) => `- ${e}`), '');
	}

	const nodeConfigs = new Map<string, Record<string, unknown>>();
	for (const node of workflowJson.nodes) {
		if (node.name && node.parameters) {
			nodeConfigs.set(node.name, { type: node.type, parameters: node.parameters });
		}
	}

	const executedNodeNames = new Set(Object.keys(evalResult.nodeResults));
	sections.push('## Workflow structure (all nodes)', '');
	for (const node of workflowJson.nodes) {
		const ran = node.name ? executedNodeNames.has(node.name) : false;
		const status = ran ? 'EXECUTED' : 'DID NOT RUN';
		sections.push(`- **${node.name ?? '(unnamed)'}** (${node.type}) — ${status}`);
	}
	sections.push('');
	sections.push(
		'**All node configs** (from saved workflow JSON, including nodes that did not run):',
	);
	sections.push(
		'```json',
		JSON.stringify(
			workflowJson.nodes.map((node) => ({
				name: node.name ?? '(unnamed)',
				type: node.type,
				typeVersion: node.typeVersion,
				...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
				parameters: node.parameters ?? {},
			})),
			null,
			2,
		),
		'```',
	);
	sections.push('');
	sections.push('**Connections:**');
	sections.push('```json', JSON.stringify(workflowJson.connections, null, 2), '```');
	sections.push('');

	sections.push('## Execution trace', '');
	const sortedNodeResults = Object.entries(evalResult.nodeResults).sort(
		([, a], [, b]) => (a.startTime ?? 0) - (b.startTime ?? 0),
	);
	for (const [nodeName, nr] of sortedNodeResults) {
		sections.push(`### ${nodeName} [${nr.executionMode}]`);
		const nodeConfig = nodeConfigs.get(nodeName);
		if (nodeConfig) {
			sections.push('**Node config:**');
			sections.push('```json', JSON.stringify(nodeConfig, null, 2), '```');
		}
		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			sections.push(`**Config issues:** ${Object.values(nr.configIssues).flat().join('; ')}`);
		}
		for (const req of nr.interceptedRequests) {
			sections.push(`**Request:** ${req.method} ${req.url}`);
			if (req.requestBody) {
				sections.push('```json', JSON.stringify(req.requestBody, null, 2), '```');
			}
			if (req.mockResponse) {
				sections.push('**Mock response:**');
				sections.push('```json', JSON.stringify(req.mockResponse, null, 2), '```');
			}
		}
		if (nr.output !== null && nr.output !== undefined) {
			sections.push('**Output:**');
			sections.push('```json', JSON.stringify(nr.output, null, 2), '```');
		} else {
			sections.push('**Output:** none');
		}
		sections.push('');
	}

	return sections.join('\n');
}

function readJson<T>(filePath: string): T {
	return jsonParse<T>(readFileSync(filePath, 'utf8'));
}

function querySqlite(sql: string): string {
	return execFileSync('sqlite3', [sqliteDbPath, sql], { encoding: 'utf8' }).trim();
}

function getWorkflowIdFromLatestReport(): string {
	const html = readFileSync(reportPath, 'utf8');
	const match = html.match(/<span class="workflow-id">([^<]+)<\/span>/);
	if (!match?.[1]) throw new Error(`Could not find workflow id in ${reportPath}`);
	return match[1];
}

function getWorkflowJson(workflowId: string): WorkflowJson {
	const row = querySqlite(
		`select json_object('nodes', json(nodes), 'connections', json(connections)) from workflow_entity where id='${workflowId}';`,
	);
	if (!row) throw new Error(`Workflow ${workflowId} not found in sqlite db`);
	return jsonParse<WorkflowJson>(row);
}

async function getEvalResultForScenario(
	scenarioName: string,
	workflowId: string,
	scenario: Scenario,
): Promise<EvalResult> {
	const evalResults = readJson<{
		testCases: Array<{
			scenarios: Array<{
				name: string;
				runs: Array<{ evalResult?: EvalResult }>;
			}>;
		}>;
	}>(evalResultsPath);

	const stored = evalResults.testCases
		.flatMap((testCaseResult) => testCaseResult.scenarios)
		.find((scenarioResult) => scenarioResult.name === scenarioName)
		?.runs.find((item) => item.evalResult !== undefined)?.evalResult;

	if (stored) return stored;

	const baseUrl =
		process.env.N8N_EVAL_BASE_URL ?? process.env.N8N_BASE_URL ?? 'http://localhost:5678';
	const client = new N8nClient(baseUrl);
	await client.login();
	return await client.executeWithLlmMock(workflowId, scenario.dataSetup, 120_000);
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const workflowId = getWorkflowIdFromLatestReport();
	const testCase = readJson<{ scenarios: Scenario[] }>(args.testCasePath);
	const scenarioName = args.scenarioName ?? testCase.scenarios[0]?.name;
	if (!scenarioName) throw new Error(`No scenarios found in ${args.testCasePath}`);
	const scenario = testCase.scenarios.find((item) => item.name === scenarioName);
	if (!scenario) throw new Error(`Scenario "${scenarioName}" not found in ${args.testCasePath}`);

	const workflowJson = getWorkflowJson(workflowId);
	const checklist = [
		{
			id: 1,
			description: scenario.successCriteria,
			category: 'execution',
			strategy: 'llm',
		},
	];
	const evalResult = await getEvalResultForScenario(scenarioName, workflowId, scenario);
	const artifact = buildVerificationArtifact(scenario, evalResult, workflowJson);
	const userMessage = `## Checklist\n\n${JSON.stringify(checklist, null, 2)}\n\n## Verification Artifact\n\n${artifact}\n\nVerify each checklist item against the artifact above.`;

	const requestBody = {
		model: (process.env.N8N_INSTANCE_AI_MODEL ?? 'openai/gpt-5.5').split('/').at(-1) ?? 'gpt-5.5',
		input: [
			{
				role: 'developer',
				content: MOCK_EXECUTION_VERIFY_PROMPT,
			},
			{
				role: 'user',
				content: [
					{
						type: 'input_text',
						text: userMessage,
					},
				],
			},
		],
		text: {
			format: {
				type: 'json_schema',
				strict: true,
				name: 'response',
				schema: {
					type: 'object',
					properties: {
						results: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: 'number' },
									pass: { type: 'boolean' },
									reasoning: { type: 'string' },
									failureCategory: { type: ['string', 'null'] },
									rootCause: { type: ['string', 'null'] },
								},
								required: ['id', 'pass', 'reasoning', 'failureCategory', 'rootCause'],
								additionalProperties: false,
							},
						},
					},
					required: ['results'],
					additionalProperties: false,
					$schema: 'http://json-schema.org/draft-07/schema#',
				},
			},
		},
	};

	mkdirSync(dataDir, { recursive: true });
	const outputPath = path.join(dataDir, `openai-verifier-request-${scenarioName}.json`);
	writeFileSync(outputPath, JSON.stringify(requestBody, null, 2));
	console.log(outputPath);
}

void main();
