/**
 * Tests for embed-sdk-api.ts
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test embed-sdk-api.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Test Suite
// =============================================================================

describe('embed-sdk-api', () => {
	let embedSdkApi: typeof import('../../scripts/embed-sdk-api');

	const SDK_API_PATH = path.resolve(__dirname, '../types/sdk-api.ts');
	const OUTPUT_PATH = path.resolve(__dirname, '../types/sdk-api-content.ts');

	beforeAll(async () => {
		// Dynamic import to handle module not existing yet
		try {
			embedSdkApi = await import('../../scripts/embed-sdk-api');
		} catch {
			// Module doesn't export functions yet - tests will fail as expected in TDD
		}
	});

	describe('embedSdkApi function', () => {
		it('should export an embedSdkApi function', () => {
			expect(embedSdkApi.embedSdkApi).toBeDefined();
			expect(typeof embedSdkApi.embedSdkApi).toBe('function');
		});

		it('should read the sdk-api.ts file content', async () => {
			// The function should read from src/types/sdk-api.ts
			const result = await embedSdkApi.embedSdkApi();

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
		});

		it('should generate valid TypeScript with SDK_API_CONTENT constant', async () => {
			const result = await embedSdkApi.embedSdkApi();

			// Should export the constant
			expect(result).toContain('export const SDK_API_CONTENT');
			// Should be a template literal
			expect(result).toContain('`');
		});

		it('should include the actual SDK API content in the constant', async () => {
			const result = await embedSdkApi.embedSdkApi();

			// Should contain key parts of sdk-api.ts
			expect(result).toContain('WorkflowBuilder');
			expect(result).toContain('NodeInstance');
			expect(result).toContain('TriggerInstance');
		});

		it('should escape backticks in the source content', async () => {
			const result = await embedSdkApi.embedSdkApi();

			// The content inside the template literal should have escaped backticks
			// Extract the content between the template literal delimiters
			const match = result.match(/SDK_API_CONTENT = `([\s\S]*)`;\n$/);
			expect(match).toBeTruthy();

			const innerContent = match![1];
			// Any backticks in the inner content should be escaped with backslash
			// The source file may contain template literals like `...` which need escaping
			// After escaping, we should see \` not standalone `
			const unescapedBackticks = innerContent.match(/(?<!\\)`/g);
			expect(unescapedBackticks).toBeNull(); // No unescaped backticks
		});

		it('should escape dollar signs to prevent template interpolation', async () => {
			const result = await embedSdkApi.embedSdkApi();

			// Extract the content between the template literal delimiters
			const match = result.match(/SDK_API_CONTENT = `([\s\S]*)`;\n$/);
			expect(match).toBeTruthy();

			const innerContent = match![1];
			// Dollar signs should be escaped to prevent ${...} interpolation
			// After escaping, we should see \$ not standalone $
			// Check for unescaped ${
			const unescapedInterpolation = innerContent.match(/(?<!\\)\$\{/g);
			expect(unescapedInterpolation).toBeNull(); // No unescaped interpolation
		});
	});

	describe('writeEmbeddedSdkApi function', () => {
		it('should export a writeEmbeddedSdkApi function', () => {
			expect(embedSdkApi.writeEmbeddedSdkApi).toBeDefined();
			expect(typeof embedSdkApi.writeEmbeddedSdkApi).toBe('function');
		});

		it('should write the generated content to sdk-api-content.ts', async () => {
			await embedSdkApi.writeEmbeddedSdkApi();

			// Check that the file was created
			expect(fs.existsSync(OUTPUT_PATH)).toBe(true);

			// Read and verify content
			const content = fs.readFileSync(OUTPUT_PATH, 'utf-8');
			expect(content).toContain('export const SDK_API_CONTENT');
		});

		it('should generate valid TypeScript that can be imported', async () => {
			await embedSdkApi.writeEmbeddedSdkApi();

			// Try to dynamically import the generated file
			const generated = await import('../types/sdk-api-content');
			expect(generated.SDK_API_CONTENT).toBeDefined();
			expect(typeof generated.SDK_API_CONTENT).toBe('string');
			expect(generated.SDK_API_CONTENT.length).toBeGreaterThan(1000); // Should be substantial
		});
	});

	describe('generated SDK_API_CONTENT', () => {
		beforeAll(async () => {
			// Generate the file first
			try {
				await embedSdkApi.writeEmbeddedSdkApi();
			} catch {
				// Will fail if function not implemented
			}
		});

		it('should contain all major type definitions', async () => {
			let sdkApiContent: { SDK_API_CONTENT: string };
			try {
				sdkApiContent = await import('../types/sdk-api-content');
			} catch {
				// Skip if not generated
				return;
			}

			const content = sdkApiContent.SDK_API_CONTENT;

			// Core types
			expect(content).toContain('interface IDataObject');
			expect(content).toContain('interface WorkflowSettings');
			expect(content).toContain('interface NodeConfig');
			expect(content).toContain('interface NodeInstance');
			expect(content).toContain('interface TriggerInstance');
			expect(content).toContain('interface NodeChain');
			expect(content).toContain('interface WorkflowBuilder');

			// AI/LangChain subnode types
			expect(content).toContain('interface LanguageModelInstance');
			expect(content).toContain('interface MemoryInstance');
			expect(content).toContain('interface ToolInstance');

			// Factory functions
			expect(content).toContain('type WorkflowFn');
			expect(content).toContain('type NodeFn');
			expect(content).toContain('type TriggerFn');
			expect(content).toContain('type MergeFn');
		});

		it('should contain JSDoc comments', async () => {
			let sdkApiContent: { SDK_API_CONTENT: string };
			try {
				sdkApiContent = await import('../types/sdk-api-content');
			} catch {
				// Skip if not generated
				return;
			}

			const content = sdkApiContent.SDK_API_CONTENT;

			// Should preserve JSDoc
			expect(content).toContain('/**');
			expect(content).toContain('*/');
			expect(content).toContain('@example');
		});
	});
});
