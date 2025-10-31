import { CliParser } from '@n8n/backend-common';
import { z } from 'zod';

describe('evaluations CLI parsing', () => {
	const flagsSchema = z.object({
		testCase: z.string().optional(),
		promptsCsv: z.string().optional(),
		repetitions: z.coerce.number().int().positive().default(1),
		useLangsmith: z.boolean().optional().default(false),
		generateTestCases: z.boolean().optional().default(false),
	});

	const createCliParser = () => {
		const logger = { debug: () => {} };
		return new CliParser(logger as never);
	};

	describe('testCase flag', () => {
		it('should parse --test-case flag correctly', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--test-case', 'my-test-id'],
				flagsSchema,
			});

			expect(result.flags.testCase).toBe('my-test-id');
		});

		it('should handle missing --test-case flag', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js'],
				flagsSchema,
			});

			expect(result.flags.testCase).toBeUndefined();
		});
	});

	describe('promptsCsv flag', () => {
		it('should parse --prompts-csv flag with value', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--prompts-csv', 'path/to/prompts.csv'],
				flagsSchema,
			});

			expect(result.flags.promptsCsv).toBe('path/to/prompts.csv');
		});

		it('should reject --prompts-csv flag without value', () => {
			const parser = createCliParser();

			// yargs-parser treats flags without values as true, but zod schema expects string
			// so it should throw a validation error
			expect(() => {
				parser.parse({
					argv: ['node', 'script.js', '--prompts-csv'],
					flagsSchema,
				});
			}).toThrow();
		});
	});

	describe('repetitions flag', () => {
		it('should parse --repetitions flag correctly', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--repetitions', '5'],
				flagsSchema,
			});

			expect(result.flags.repetitions).toBe(5);
		});

		it('should default to 1 when --repetitions not provided', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js'],
				flagsSchema,
			});

			expect(result.flags.repetitions).toBe(1);
		});

		it('should coerce string to number', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--repetitions', '10'],
				flagsSchema,
			});

			expect(result.flags.repetitions).toBe(10);
			expect(typeof result.flags.repetitions).toBe('number');
		});

		it('should reject negative numbers', () => {
			const parser = createCliParser();

			expect(() => {
				parser.parse({
					argv: ['node', 'script.js', '--repetitions', '-1'],
					flagsSchema,
				});
			}).toThrow();
		});

		it('should reject zero', () => {
			const parser = createCliParser();

			expect(() => {
				parser.parse({
					argv: ['node', 'script.js', '--repetitions', '0'],
					flagsSchema,
				});
			}).toThrow();
		});
	});

	describe('useLangsmith flag', () => {
		it('should parse --use-langsmith flag as true', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--use-langsmith'],
				flagsSchema,
			});

			expect(result.flags.useLangsmith).toBe(true);
		});

		it('should default to false when not provided', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js'],
				flagsSchema,
			});

			expect(result.flags.useLangsmith).toBe(false);
		});
	});

	describe('generateTestCases flag', () => {
		it('should parse --generate-test-cases flag as true', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js', '--generate-test-cases'],
				flagsSchema,
			});

			expect(result.flags.generateTestCases).toBe(true);
		});

		it('should default to false when not provided', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: ['node', 'script.js'],
				flagsSchema,
			});

			expect(result.flags.generateTestCases).toBe(false);
		});
	});

	describe('combined flags', () => {
		it('should parse multiple flags together', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: [
					'node',
					'script.js',
					'--test-case',
					'test-123',
					'--repetitions',
					'3',
					'--use-langsmith',
				],
				flagsSchema,
			});

			expect(result.flags.testCase).toBe('test-123');
			expect(result.flags.repetitions).toBe(3);
			expect(result.flags.useLangsmith).toBe(true);
			expect(result.flags.generateTestCases).toBe(false);
		});

		it('should parse all flags when provided', () => {
			const parser = createCliParser();
			const result = parser.parse({
				argv: [
					'node',
					'script.js',
					'--test-case',
					'test-abc',
					'--prompts-csv',
					'data.csv',
					'--repetitions',
					'7',
					'--use-langsmith',
					'--generate-test-cases',
				],
				flagsSchema,
			});

			expect(result.flags.testCase).toBe('test-abc');
			expect(result.flags.promptsCsv).toBe('data.csv');
			expect(result.flags.repetitions).toBe(7);
			expect(result.flags.useLangsmith).toBe(true);
			expect(result.flags.generateTestCases).toBe(true);
		});
	});
});
