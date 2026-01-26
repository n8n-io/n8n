import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { promptCategorizationChain } from '@/chains/prompt-categorization';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';

import { setupIntegrationLLM, shouldRunIntegrationTests } from './test-helpers';

/**
 * Integration tests for prompt categorization chain
 *
 * These tests use a real LLM and make actual API calls.
 * They are skipped by default and only run when ENABLE_INTEGRATION_TESTS=true
 *
 * To run these tests:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test prompt-categorization.integration
 */

// Test prompts covering different workflow types
const testPrompts = [
	{
		name: 'Monitoring workflow',
		prompt:
			'Create a workflow that monitors my website every 5 minutes and sends me a Slack notification if it goes down',
		expectedTechniques: [
			WorkflowTechnique.SCHEDULING,
			WorkflowTechnique.MONITORING,
			WorkflowTechnique.NOTIFICATION,
		],
	},
	{
		name: 'Form input with AI',
		prompt:
			'Set up a form to collect user feedback, analyze sentiment with AI, and store the results in Airtable',
		expectedTechniques: [
			WorkflowTechnique.FORM_INPUT,
			WorkflowTechnique.DATA_ANALYSIS,
			WorkflowTechnique.DATA_TRANSFORMATION,
			WorkflowTechnique.DATA_PERSISTENCE,
		],
	},
	{
		name: 'Scraping and research',
		prompt:
			'Scrape competitor pricing daily and generate a weekly summary report with price changes',
		expectedTechniques: [
			WorkflowTechnique.SCHEDULING,
			WorkflowTechnique.SCRAPING_AND_RESEARCH,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_PERSISTENCE,
		],
	},
	{
		name: 'Chatbot workflow',
		prompt:
			'Build a chatbot that can answer customer questions about our product catalog using information from our knowledge base',
		expectedTechniques: [WorkflowTechnique.CHATBOT, WorkflowTechnique.KNOWLEDGE_BASE],
	},
	{
		name: 'Document processing',
		prompt:
			'Extract data from PDF invoices uploaded via form and update our accounting spreadsheet',
		expectedTechniques: [
			WorkflowTechnique.FORM_INPUT,
			WorkflowTechnique.DOCUMENT_PROCESSING,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_PERSISTENCE,
		],
	},
	{
		name: 'Scheduled content generation',
		prompt: 'Generate and post daily social media content about trending topics in AI',
		expectedTechniques: [WorkflowTechnique.SCHEDULING, WorkflowTechnique.CONTENT_GENERATION],
	},
	{
		name: 'Human in the loop approval',
		prompt:
			'When a new customer signs up for premium plan, send approval request to sales team before activating',
		expectedTechniques: [
			WorkflowTechnique.HUMAN_IN_THE_LOOP,
			WorkflowTechnique.NOTIFICATION,
			WorkflowTechnique.TRIAGE,
		],
	},
	{
		name: 'Data persistence workflow',
		prompt: 'Save all incoming webhook data from our payment provider for audit purposes',
		expectedTechniques: [WorkflowTechnique.DATA_PERSISTENCE],
	},
];

// Helper to check if expected techniques are present
function hasExpectedTechniques(
	result: WorkflowTechniqueType[],
	expected: WorkflowTechniqueType[],
): { hasAll: boolean; missing: WorkflowTechniqueType[] } {
	const missing = expected.filter((tech) => !result.includes(tech));
	return {
		hasAll: missing.length === 0,
		missing,
	};
}

// Helper to calculate technique frequency
function calculateTechniqueFrequency(
	results: Array<{ techniques: WorkflowTechniqueType[] }>,
): Map<WorkflowTechniqueType, number> {
	const frequency = new Map<WorkflowTechniqueType, number>();
	for (const result of results) {
		for (const technique of result.techniques) {
			frequency.set(technique, (frequency.get(technique) ?? 0) + 1);
		}
	}
	return frequency;
}

describe('Prompt Categorization Chain - Integration Tests', () => {
	let llm: BaseChatModel;

	// Skip all tests if integration tests are not enabled
	const skipTests = !shouldRunIntegrationTests();

	// Set default timeout for all tests in this suite
	jest.setTimeout(120000); // 2 minutes for comprehensive suite

	beforeAll(async () => {
		if (skipTests) {
			console.log(
				'\n⏭️  Skipping integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.\n',
			);
			return;
		}

		console.log('\n🚀 Setting up integration test environment...\n');
		llm = await setupIntegrationLLM();
	});

	describe('Basic categorization', () => {
		it('should categorize a simple monitoring workflow', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(
				llm,
				'Monitor my website and send alerts when it goes down',
			);

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBeGreaterThan(0);
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);

			// Should include monitoring
			expect(result.techniques).toContain(WorkflowTechnique.MONITORING);
		});

		it('should categorize a form input workflow', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(
				llm,
				'Create a form to collect customer feedback and store it in a database',
			);

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBeGreaterThan(0);

			// Should include form input
			expect(result.techniques).toContain(WorkflowTechnique.FORM_INPUT);
		});

		it('should categorize a chatbot workflow', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(
				llm,
				'Build a chatbot that answers questions from customers',
			);

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBeGreaterThan(0);

			// Should include chatbot
			expect(result.techniques).toContain(WorkflowTechnique.CHATBOT);
		});
	});

	describe('Complex multi-technique workflows', () => {
		it('should identify multiple techniques in a complex workflow', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(
				llm,
				'Scrape competitor websites daily, extract pricing data, analyze trends, and send weekly summary reports via email',
			);

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBeGreaterThanOrEqual(3);

			// Should include multiple techniques
			expect(result.techniques).toContain(WorkflowTechnique.SCHEDULING);
			expect(result.techniques).toContain(WorkflowTechnique.SCRAPING_AND_RESEARCH);
			expect(result.techniques).toContain(WorkflowTechnique.NOTIFICATION);
		});
	});

	describe('Comprehensive test suite', () => {
		it('should categorize all test prompts and display frequency statistics', async () => {
			if (skipTests) return;

			console.log('\n📊 Running comprehensive categorization test suite...\n');

			const results: Array<{
				name: string;
				prompt: string;
				techniques: WorkflowTechniqueType[];
				confidence: number;
				expectedMatch: boolean;
				missing: WorkflowTechniqueType[];
			}> = [];

			// Run all test prompts
			for (const test of testPrompts) {
				const result = await promptCategorizationChain(llm, test.prompt);
				const check = hasExpectedTechniques(result.techniques, test.expectedTechniques);

				results.push({
					name: test.name,
					prompt: test.prompt,
					techniques: result.techniques,
					confidence: result.confidence ?? 0,
					expectedMatch: check.hasAll,
					missing: check.missing,
				});

				// Log individual result
				console.log(`✓ ${test.name}`);
				console.log(`  Techniques: ${result.techniques.join(', ')}`);
				console.log(`  Confidence: ${((result.confidence ?? 0) * 100).toFixed(1)}%`);
				if (!check.hasAll) {
					console.log(`  ⚠️  Missing expected: ${check.missing.join(', ')}`);
				}
				console.log('');
			}

			// Calculate and display statistics
			const frequency = calculateTechniqueFrequency(results);
			const sortedFrequency = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);

			console.log('\n📈 Technique Frequency:');
			console.log('─'.repeat(60));
			for (const [technique, count] of sortedFrequency) {
				const percentage = ((count / results.length) * 100).toFixed(1);
				console.log(`  ${technique.padEnd(30)} ${count} (${percentage}%)`);
			}
			console.log('');

			// Calculate match rate
			const matchCount = results.filter((r) => r.expectedMatch).length;
			const matchRate = (matchCount / results.length) * 100;
			console.log(`✓ Expected technique match rate: ${matchRate.toFixed(1)}%`);
			console.log(`  ${matchCount}/${results.length} prompts matched all expected techniques\n`);

			// All results should have valid techniques and confidence
			for (const result of results) {
				expect(result.techniques.length).toBeGreaterThan(0);
				expect(result.confidence).toBeGreaterThanOrEqual(0);
				expect(result.confidence).toBeLessThanOrEqual(1);
			}

			// At least 70% should match expected techniques (allowing for some LLM variation)
			expect(matchRate).toBeGreaterThanOrEqual(70);
		});
	});

	describe('Edge cases', () => {
		it('should not provide techniques for vague prompt', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(llm, 'Automate my business process');

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBe(0);
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('should handle very specific technical prompts', async () => {
			if (skipTests) return;

			const result = await promptCategorizationChain(
				llm,
				'Use HTTP Request node to call OpenAI API, parse JSON response with JQ, store embeddings in Pinecone vector database, then create a chatbot interface',
			);

			expect(result.techniques).toBeDefined();
			expect(result.techniques.length).toBeGreaterThan(0);
			expect(result.techniques).toContain(WorkflowTechnique.CHATBOT);
			expect(result.techniques).toContain(WorkflowTechnique.KNOWLEDGE_BASE);
		});
	});
});
