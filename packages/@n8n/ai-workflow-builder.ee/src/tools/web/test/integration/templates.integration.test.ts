import { shouldRunIntegrationTests } from '@/chains/test/integration/test-helpers';
import type { Category } from '@/types';

import { fetchTemplateList, fetchTemplateByID } from '../../templates';

/**
 * Integration tests for templates API
 *
 * These tests make actual API calls to n8n's template API.
 * They are skipped by default and only run when ENABLE_INTEGRATION_TESTS=true
 *
 * To run these tests:
 * ENABLE_INTEGRATION_TESTS=true pnpm test templates.integration
 */

describe('Templates API - Integration Tests', () => {
	const skipTests = !shouldRunIntegrationTests();

	// Set default timeout for all tests in this suite
	jest.setTimeout(30000); // 30 seconds for API calls

	beforeAll(() => {
		if (skipTests) {
			console.log(
				'\n⏭️  Skipping integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.\n',
			);
		}
	});

	describe('fetchTemplateList', () => {
		it('should fetch templates with search query', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({ search: 'slack' });

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();
			expect(Array.isArray(result.workflows)).toBe(true);
			expect(result.totalWorkflows).toBeGreaterThanOrEqual(0);

			// If there are results, check structure
			if (result.workflows.length > 0) {
				const workflow = result.workflows[0];
				expect(workflow.id).toBeDefined();
				expect(workflow.name).toBeDefined();
				expect(typeof workflow.name).toBe('string');
				expect(workflow.nodes).toBeDefined();
				expect(Array.isArray(workflow.nodes)).toBe(true);
			}
		});

		it('should fetch templates with category filter', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({ category: 'Marketing' as Category });

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();
			expect(Array.isArray(result.workflows)).toBe(true);
			expect(result.totalWorkflows).toBeGreaterThanOrEqual(0);

			// If there are results, check structure
			if (result.workflows.length > 0) {
				const workflow = result.workflows[0];
				expect(workflow.id).toBeDefined();
				expect(workflow.name).toBeDefined();
				expect(workflow.nodes).toBeDefined();
			}
		});

		it('should fetch templates without any filters', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({});

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();
			expect(Array.isArray(result.workflows)).toBe(true);
			expect(result.totalWorkflows).toBeGreaterThanOrEqual(0);

			// Should return some results when no filter is applied
			expect(result.workflows.length).toBeGreaterThan(0);
		});

		it('should handle search with no results gracefully', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({
				search: 'xyznonexistentworkflow123456789',
			});

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();
			expect(Array.isArray(result.workflows)).toBe(true);
			expect(result.workflows.length).toBe(0);
			expect(result.totalWorkflows).toBe(0);
		});

		it('should return results ordered by views (most popular first)', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({ search: 'email' });

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();

			// If we have at least 2 results, check ordering
			if (result.workflows.length >= 2) {
				const firstViews = result.workflows[0].totalViews ?? 0;
				const secondViews = result.workflows[1].totalViews ?? 0;

				// First result should have more or equal views than second
				expect(firstViews).toBeGreaterThanOrEqual(secondViews);
			}
		});

		it('should validate response structure for all workflows', async () => {
			if (skipTests) return;

			const result = await fetchTemplateList({ search: 'webhook' });

			expect(result).toBeDefined();
			expect(result.workflows).toBeDefined();

			// Validate structure of each workflow
			for (const workflow of result.workflows) {
				expect(workflow.id).toBeDefined();
				expect(typeof workflow.id).toBe('number');
				expect(workflow.name).toBeDefined();
				expect(typeof workflow.name).toBe('string');
				expect(workflow.description).toBeDefined();
				expect(workflow.nodes).toBeDefined();
				expect(Array.isArray(workflow.nodes)).toBe(true);

				// User info should be present
				expect(workflow.user).toBeDefined();
				expect(workflow.user.id).toBeDefined();
			}
		});
	});

	describe('fetchTemplateByID', () => {
		let validTemplateId: number;

		beforeAll(async () => {
			if (skipTests) return;

			// Get a valid template ID from the list
			const result = await fetchTemplateList({});
			if (result.workflows.length > 0) {
				validTemplateId = result.workflows[0].id;
			}
		});

		it('should fetch a template by valid ID', async () => {
			if (skipTests) return;

			expect(validTemplateId).toBeDefined();

			const result = await fetchTemplateByID(validTemplateId);

			expect(result).toBeDefined();
			expect(result.id).toBe(validTemplateId);
			expect(result.name).toBeDefined();
			expect(typeof result.name).toBe('string');
			expect(result.workflow).toBeDefined();
			expect(result.workflow.nodes).toBeDefined();
			expect(Array.isArray(result.workflow.nodes)).toBe(true);
			expect(result.workflow.connections).toBeDefined();
		});

		it('should include complete workflow data', async () => {
			if (skipTests) return;

			const result = await fetchTemplateByID(validTemplateId);

			expect(result.workflow).toBeDefined();
			expect(result.workflow.nodes).toBeDefined();
			expect(result.workflow.nodes.length).toBeGreaterThan(0);

			// Check first node structure
			const firstNode = result.workflow.nodes[0];
			expect(firstNode.id).toBeDefined();
			expect(firstNode.name).toBeDefined();
			expect(firstNode.type).toBeDefined();
			expect(firstNode.position).toBeDefined();
			expect(firstNode.parameters).toBeDefined();
		});

		it('should handle invalid template ID with error', async () => {
			if (skipTests) return;

			// Use a very large ID that likely doesn't exist
			const invalidId = 999999999;

			await expect(fetchTemplateByID(invalidId)).rejects.toThrow();
		});

		it('should fetch multiple templates with different workflows', async () => {
			if (skipTests) return;

			// Get multiple template IDs
			const listResult = await fetchTemplateList({});

			const firstId = listResult.workflows[0].id;
			const secondId = listResult.workflows[1].id;

			const firstTemplate = await fetchTemplateByID(firstId);
			const secondTemplate = await fetchTemplateByID(secondId);

			expect(firstTemplate.id).toBe(firstId);
			expect(secondTemplate.id).toBe(secondId);
			expect(firstTemplate.id).not.toBe(secondTemplate.id);
			expect(firstTemplate.name).not.toBe(secondTemplate.name);
		});
	});

	describe('Integration between list and fetch', () => {
		it('should fetch detailed workflow for each search result', async () => {
			if (skipTests) return;

			// Search for templates
			const listResult = await fetchTemplateList({ search: 'chatbot' });

			// Take first 3 results (or less if fewer available)
			const templatesToFetch = listResult.workflows.slice(0, 3);

			for (const template of templatesToFetch) {
				const detailedTemplate = await fetchTemplateByID(template.id);

				// The basic info should match
				expect(detailedTemplate.id).toBe(template.id);
				expect(detailedTemplate.name).toBe(template.name);
				expect(detailedTemplate.name.toLowerCase()).toContain('chatbot');

				// Detailed version should have complete workflow
				expect(detailedTemplate.workflow).toBeDefined();
				expect(detailedTemplate.workflow.nodes.length).toBeGreaterThan(0);
			}
		});
	});

	describe('API response validation', () => {
		it('should receive consistent data types across multiple calls', async () => {
			if (skipTests) return;

			// Make multiple calls and verify consistency
			const queries = ['email', 'slack', 'database'];
			const results = [];

			for (const query of queries) {
				const result = await fetchTemplateList({ search: query });
				results.push(result);

				// Verify structure
				expect(typeof result.totalWorkflows).toBe('number');
				expect(Array.isArray(result.workflows)).toBe(true);

				for (const workflow of result.workflows) {
					expect(typeof workflow.id).toBe('number');
					expect(typeof workflow.name).toBe('string');
					expect(Array.isArray(workflow.nodes)).toBe(true);
				}
			}
		});
	});
});
