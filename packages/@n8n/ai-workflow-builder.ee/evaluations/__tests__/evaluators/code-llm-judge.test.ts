/**
 * Tests for code-llm-judge evaluator.
 *
 * This evaluator uses an LLM to analyze generated TypeScript SDK code
 * for quality issues like expression syntax errors, API misuse, and security problems.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { SimpleWorkflow } from '@/types/workflow';
import type { EvaluationContext } from '../../harness/harness-types';

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create evaluation context with generated code */
function createContext(generatedCode?: string): EvaluationContext {
	return {
		prompt: 'Create a test workflow',
		generatedCode,
	};
}

/** Create a mock LLM that returns structured output */
function createMockLLM(mockResponse: Record<string, unknown>): BaseChatModel {
	const mockLLM = {
		withStructuredOutput: jest.fn().mockReturnValue({
			invoke: jest.fn().mockResolvedValue(mockResponse),
		}),
	} as unknown as BaseChatModel;
	return mockLLM;
}

describe('Code LLM Judge Evaluator', () => {
	describe('createCodeLLMJudgeEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({
				overallScore: 1,
				expressionSyntax: { score: 1, violations: [] },
				apiUsage: { score: 1, violations: [] },
				security: { score: 1, violations: [] },
				codeQuality: { score: 1, violations: [] },
				summary: 'Perfect code',
			});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			expect(evaluator.name).toBe('code-llm-judge');
		});

		it('should skip evaluation when no generated code is provided', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			const workflow = createMockWorkflow();
			const context = createContext(undefined);

			const feedback = await evaluator.evaluate(workflow, context);

			expect(feedback).toHaveLength(1);
			expect(feedback[0]).toMatchObject({
				evaluator: 'code-llm-judge',
				metric: 'skipped',
				score: 1,
				kind: 'score',
			});
		});

		it('should return feedback with overall score', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({
				overallScore: 0.85,
				expressionSyntax: { score: 1, violations: [] },
				apiUsage: { score: 0.7, violations: [] },
				security: { score: 1, violations: [] },
				codeQuality: { score: 0.7, violations: [] },
				summary: 'Good code with minor issues',
			});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			const validCode = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger);
`;

			const workflow = createMockWorkflow();
			const context = createContext(validCode);

			const feedback = await evaluator.evaluate(workflow, context);

			const overallFeedback = feedback.find((f) => f.metric === 'overallScore');
			expect(overallFeedback).toBeDefined();
			expect(overallFeedback?.score).toBe(0.85);
			expect(overallFeedback?.kind).toBe('score');
		});

		it('should return feedback for all evaluation categories', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({
				overallScore: 0.9,
				expressionSyntax: { score: 1, violations: [] },
				apiUsage: { score: 0.8, violations: [] },
				security: { score: 1, violations: [] },
				codeQuality: { score: 0.8, violations: [] },
				summary: 'Good code',
			});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			const workflow = createMockWorkflow();
			const context = createContext('return workflow("id", "name");');

			const feedback = await evaluator.evaluate(workflow, context);

			const metrics = feedback.map((f) => f.metric);
			expect(metrics).toContain('overallScore');
			expect(metrics).toContain('expressionSyntax');
			expect(metrics).toContain('apiUsage');
			expect(metrics).toContain('security');
			expect(metrics).toContain('codeQuality');
		});

		it('should include violation comments in feedback', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({
				overallScore: 0.6,
				expressionSyntax: {
					score: 0.5,
					violations: [
						{
							type: 'syntax',
							severity: 'major',
							description: 'Missing = prefix in expression',
						},
					],
				},
				apiUsage: { score: 1, violations: [] },
				security: { score: 1, violations: [] },
				codeQuality: { score: 1, violations: [] },
				summary: 'Expression syntax issues found',
			});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			const workflow = createMockWorkflow();
			const context = createContext('return workflow("id", "name");');

			const feedback = await evaluator.evaluate(workflow, context);

			const expressionFeedback = feedback.find((f) => f.metric === 'expressionSyntax');
			expect(expressionFeedback?.comment).toContain('Missing = prefix');
		});

		it('should detect security violations like hardcoded credentials', async () => {
			const { createCodeLLMJudgeEvaluator } = await import('../../evaluators/code-llm-judge');
			const mockLLM = createMockLLM({
				overallScore: 0.5,
				expressionSyntax: { score: 1, violations: [] },
				apiUsage: { score: 1, violations: [] },
				security: {
					score: 0.3,
					violations: [
						{
							type: 'security',
							severity: 'critical',
							description: 'Hardcoded API key detected',
						},
					],
				},
				codeQuality: { score: 1, violations: [] },
				summary: 'Critical security issue: hardcoded credentials',
			});
			const evaluator = createCodeLLMJudgeEvaluator(mockLLM);

			const workflow = createMockWorkflow();
			const context = createContext('const apiKey = "sk-12345";');

			const feedback = await evaluator.evaluate(workflow, context);

			const securityFeedback = feedback.find((f) => f.metric === 'security');
			expect(securityFeedback?.score).toBe(0.3);
			expect(securityFeedback?.comment).toContain('Hardcoded API key');
		});
	});
});
