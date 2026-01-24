/**
 * Tests for code-typecheck evaluator.
 *
 * This evaluator validates generated TypeScript SDK code against SDK types
 * using the TypeScript compiler to catch type errors before execution.
 */

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

describe('Code Typecheck Evaluator', () => {
	describe('createCodeTypecheckEvaluator()', () => {
		it('should create an evaluator with correct name', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			expect(evaluator.name).toBe('code-typecheck');
		});

		it('should skip evaluation when no generated code is provided', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			const workflow = createMockWorkflow();
			const context = createContext(undefined);

			const feedback = await evaluator.evaluate(workflow, context);

			expect(feedback).toHaveLength(1);
			expect(feedback[0]).toMatchObject({
				evaluator: 'code-typecheck',
				metric: 'skipped',
				score: 1,
				kind: 'score',
			});
		});

		it('should return perfect score for valid TypeScript SDK code', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

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

			const overallFeedback = feedback.find((f) => f.metric === 'overall');
			expect(overallFeedback).toBeDefined();
			expect(overallFeedback?.score).toBe(1);
			expect(overallFeedback?.kind).toBe('score');
		});

		it('should detect syntax errors with line numbers', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			// Code with actual syntax errors that TypeScript can detect
			const codeWithSyntaxError = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
// Missing closing brace and parenthesis

return workflow('test-id', 'Test Workflow')
  .add(startTrigger);
`;

			const workflow = createMockWorkflow();
			const context = createContext(codeWithSyntaxError);

			const feedback = await evaluator.evaluate(workflow, context);

			const overallFeedback = feedback.find((f) => f.metric === 'overall');
			expect(overallFeedback).toBeDefined();
			// Should detect the syntax error
			expect(overallFeedback?.score).toBeLessThan(1);
		});

		it('should detect undefined identifiers', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			const codeWithUndefinedIdentifier = `
const result = undefinedFunction();

return workflow('test-id', 'Test Workflow');
`;

			const workflow = createMockWorkflow();
			const context = createContext(codeWithUndefinedIdentifier);

			const feedback = await evaluator.evaluate(workflow, context);

			const overallFeedback = feedback.find((f) => f.metric === 'overall');
			expect(overallFeedback?.score).toBeLessThan(1);
			expect(overallFeedback?.comment).toBeDefined();
		});

		it('should return feedback with violation counts', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			const codeWithMultipleErrors = `
const a = undefinedVar1;
const b = undefinedVar2;
const c = undefinedVar3;

return workflow('test-id', 'Test Workflow');
`;

			const workflow = createMockWorkflow();
			const context = createContext(codeWithMultipleErrors);

			const feedback = await evaluator.evaluate(workflow, context);

			const totalViolations = feedback.find((f) => f.metric === 'totalViolations');
			expect(totalViolations).toBeDefined();
			expect(totalViolations?.score).toBeGreaterThanOrEqual(3);
			expect(totalViolations?.kind).toBe('detail');
		});

		it('should categorize violations by severity', async () => {
			const { createCodeTypecheckEvaluator } = await import('../../evaluators/code-typecheck');
			const evaluator = createCodeTypecheckEvaluator();

			const codeWithErrors = `
const x = undefinedVar;
return workflow('test-id', 'Test');
`;

			const workflow = createMockWorkflow();
			const context = createContext(codeWithErrors);

			const feedback = await evaluator.evaluate(workflow, context);

			const criticalErrors = feedback.find((f) => f.metric === 'criticalErrors');
			const majorErrors = feedback.find((f) => f.metric === 'majorErrors');
			const minorWarnings = feedback.find((f) => f.metric === 'minorWarnings');

			expect(criticalErrors).toBeDefined();
			expect(majorErrors).toBeDefined();
			expect(minorWarnings).toBeDefined();
		});
	});
});
