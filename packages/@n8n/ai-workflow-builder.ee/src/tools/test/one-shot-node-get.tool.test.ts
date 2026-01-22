import { createOneShotNodeGetTool } from '../one-shot-node-get.tool';

describe('OneShotNodeGetTool', () => {
	describe('createOneShotNodeGetTool', () => {
		it('should create tool without throwing when generatedTypesDir is not provided', () => {
			// This test verifies that the tool can be created without errors
			// when no custom generatedTypesDir is provided.
			expect(() => createOneShotNodeGetTool()).not.toThrow();
		});

		it('should create tool with custom generatedTypesDir', () => {
			expect(() => createOneShotNodeGetTool({ generatedTypesDir: '/tmp/test' })).not.toThrow();
		});

		it('should return a tool with correct name', () => {
			const tool = createOneShotNodeGetTool();
			expect(tool.name).toBe('get_nodes');
		});
	});

	describe('tool invocation', () => {
		it('should invoke without package.json resolution errors', async () => {
			// This test verifies that invoking the tool doesn't throw the error:
			// "Package subpath './package.json' is not defined by 'exports'"
			// The tool should handle the fallback path resolution gracefully.
			const tool = createOneShotNodeGetTool();

			// Invoke with a non-existent node - we expect an error message in the response,
			// but NOT a thrown exception related to package.json resolution.
			const result = await tool.invoke({ nodeIds: ['n8n-nodes-base.nonExistentNode'] });

			// The result should be a string (error message about node not found)
			// NOT a thrown error about package.json exports
			expect(typeof result).toBe('string');
			expect(result).toContain('not found');
		});

		it('should provide helpful error when generated types directory does not exist', async () => {
			// When a non-existent generatedTypesDir is provided, the error message
			// should indicate that the types need to be generated.
			const tool = createOneShotNodeGetTool({
				generatedTypesDir: '/non-existent-path-that-does-not-exist-12345',
			});

			// Request a valid node that should exist if types were generated
			const result = await tool.invoke({ nodeIds: ['n8n-nodes-base.httpRequest'] });

			// Should return a helpful error message about types not being generated
			expect(typeof result).toBe('string');
			expect(result).toContain('not found');
		});
	});
});
