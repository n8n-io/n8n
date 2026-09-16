import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

// CI has cold-start overhead on the first test (coverage instrumentation, module loading)
vi.setConfig({
	testTimeout: 10000,
});

describe('Decision Node Integration', () => {
	const baseUrl = 'https://api.typesafe.ai';
	const credentials = {
		typeSafeApi: {
			apiKey: 'test-api-key',
			url: baseUrl,
		},
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const systemOneResponse = {
		model: 'jev-latest',
		answers: {
			department: {
				type: 'choice',
				choice: 'billing',
				probabilities: { billing: 0.96, technical: 0.02, other: 0.02 },
				confidence: 0.92,
			},
			urgency: { type: 'noul', noul: 0.88 },
			severity: {
				type: 'score',
				score: 1.7,
				legend: { '0': 'Low impact', '1': 'Material impact', '2': 'Critical business impact' },
				probabilities: { '0': 0.05, '1': 0.3, '2': 0.65 },
				confidence: 0.79,
			},
		},
		usage: { input_tokens: 300, output_tokens: 50 },
	};

	const decisionOutput = {
		decisions: {
			department: {
				type: 'choice',
				value: 'billing',
				confidence: 0.92,
				probabilities: { billing: 0.96, technical: 0.02, other: 0.02 },
				meetsConfidenceThreshold: true,
			},
			urgency: { type: 'booleanProbability', value: true, probability: 0.88 },
			severity: {
				type: 'score',
				value: 1.7,
				confidence: 0.79,
				probabilities: { '0': 0.05, '1': 0.3, '2': 0.65 },
				legend: { '0': 'Low impact', '1': 'Material impact', '2': 'Critical business impact' },
				meetsConfidenceThreshold: false,
			},
		},
		model: 'jev-latest',
		usage: { inputTokens: 300, outputTokens: 50 },
		confidenceThreshold: 0.8,
		providerMetadata: { answers: systemOneResponse.answers },
	};

	const testData: WorkflowTestData = {
		description: 'should decide with the TypeSafe sub-node and route to the chosen output',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflows/decision-ticket-routing.json'),
		},
		output: {
			nodeData: {
				// One output for each option, plus "Low Confidence" for the threshold. The model
				// chose "billing" above the threshold, so the item is on output 0 and the
				// engine trims the empty outputs after it.
				Decision: [[{ json: decisionOutput }]],
				'Billing Team': [[{ json: decisionOutput }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/systemone',
					statusCode: 200,
					responseBody: systemOneResponse,
					requestBody: {
						state: 'The customer says they were charged twice and want their money back.',
						model: 'jev-latest',
						questions: {
							department: {
								type: 'choice',
								instructions: 'Which team should handle this request?',
								criteria: {
									billing: 'Payments, invoices, duplicate charges, and refunds',
									technical: 'Errors, bugs, configuration, and integration problems',
									other: 'None of the other categories fit',
								},
							},
							urgency: {
								type: 'noul',
								instructions: 'This request requires urgent attention',
							},
							severity: {
								type: 'score',
								instructions: 'How severe is the customer impact?',
								criteria: ['Low impact', 'Material impact', 'Critical business impact'],
							},
						},
					},
				},
			],
		},
	};

	testHarness.setupTest(testData, { credentials });
});
