import { runLLMValidation } from '../llm';

const runWith = (output: string) => ({
	run: vi.fn().mockResolvedValue(output),
	prompt: 'Test prompt',
	threshold: 0.7,
});

describe('runLLMValidation', () => {
	describe('output format validation', () => {
		it('should validate output contains only expected fields', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ confidenceScore: 0.5, flagged: false })),
			);

			expect(result.tripwireTriggered).toBe(false);
			expect(result.confidenceScore).toBe(0.5);
			expect(result.executionFailed).toBe(false);
		});

		it('should reject output with extra fields', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(
					JSON.stringify({
						confidenceScore: 0.3,
						flagged: false,
						extraField: 'should not be here',
					}),
				),
			);

			// Should fail due to strict schema validation
			expect(result.executionFailed).toBe(true);
			expect(result.tripwireTriggered).toBe(true);
		});

		it('should reject output with renamed fields', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ score: 0.3, isViolation: false })),
			);

			// Should fail due to missing required fields
			expect(result.executionFailed).toBe(true);
			expect(result.tripwireTriggered).toBe(true);
		});

		it('should handle complex nested response structures', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(
					JSON.stringify({
						analysis: { confidenceScore: 0.8, flagged: true },
						confidenceScore: 0.2,
						flagged: false,
					}),
				),
			);

			// Should fail due to extra nested fields
			expect(result.executionFailed).toBe(true);
		});

		it('should validate field types are correct', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ confidenceScore: '0.5', flagged: 'false' })),
			);

			// Should fail due to incorrect types
			expect(result.executionFailed).toBe(true);
		});
	});

	describe('threshold evaluation', () => {
		it('should correctly evaluate confidence threshold', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ confidenceScore: 0.8, flagged: true })),
			);

			expect(result.tripwireTriggered).toBe(true);
			expect(result.confidenceScore).toBe(0.8);
			expect(result.executionFailed).toBe(false);
		});

		it('should not trigger when confidence is below threshold', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ confidenceScore: 0.6, flagged: true })),
			);

			expect(result.tripwireTriggered).toBe(false);
			expect(result.confidenceScore).toBe(0.6);
		});

		it('should require both flagged and threshold conditions', async () => {
			const result = await runLLMValidation(
				'test-guardrail',
				'test input',
				runWith(JSON.stringify({ confidenceScore: 0.9, flagged: false })),
			);

			// High confidence but not flagged = should not trigger
			expect(result.tripwireTriggered).toBe(false);
		});
	});

	it('fails closed when the runner throws', async () => {
		const result = await runLLMValidation('test-guardrail', 'test input', {
			run: vi.fn().mockRejectedValue(new Error('model unavailable')),
			prompt: 'Test prompt',
			threshold: 0.7,
		});

		expect(result.executionFailed).toBe(true);
		expect(result.tripwireTriggered).toBe(true);
		expect(result.originalException).toBeInstanceOf(Error);
	});

	it('passes the assembled prompt and the input to the runner', async () => {
		const config = runWith(JSON.stringify({ confidenceScore: 0.1, flagged: false }));
		await runLLMValidation('test-guardrail', 'test input', config);

		expect(config.run).toHaveBeenCalledWith(expect.stringContaining('Test prompt'), 'test input');
	});
});
