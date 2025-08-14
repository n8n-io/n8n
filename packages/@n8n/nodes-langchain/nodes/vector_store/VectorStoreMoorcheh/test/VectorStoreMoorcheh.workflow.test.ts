import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('VectorStoreMoorcheh', () => {
	describe('Run Test Workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.moorcheh.ai');

			// Mock namespace listing
			mock
				.get('/v1/namespaces')
				.reply(200, [
					{
						name: 'test-namespace',
						type: 'vector',
						vector_dimension: 1536,
					},
				])
				.persist();

			// Mock namespace creation
			mock
				.post('/v1/namespaces')
				.reply(200, {
					success: true,
					message: 'Namespace created successfully',
				})
				.persist();

			// Mock vector upload
			mock
				.post('/v1/namespaces/test-namespace/vectors')
				.reply(200, {
					success: true,
					message: 'Vectors uploaded successfully',
				})
				.persist();

			// Mock vector search
			mock
				.post('/v1/search')
				.reply(200, [
					{
						id: 'doc_1',
						score: 0.95,
						metadata: {
							pageContent: 'This is a test document',
							source: 'test',
						},
					},
					{
						id: 'doc_2',
						score: 0.87,
						metadata: {
							pageContent: 'Another test document',
							source: 'test',
						},
					},
				])
				.persist();

			// Mock vector deletion
			mock
				.post('/v1/namespaces/test-namespace/vectors/delete')
				.reply(200, {
					success: true,
					message: 'Vectors deleted successfully',
				})
				.persist();

			// Mock namespace deletion
			mock
				.delete('/v1/namespaces/test-namespace')
				.reply(200, {
					success: true,
					message: 'Namespace deleted successfully',
				})
				.persist();
		});

		afterAll(() => {
			nock.cleanAll();
		});

		// This runs the workflow JSON test files
		new NodeTestHarness().setupTests();

		// Add a simple test to ensure the setup works
		it('should have mocked API endpoints setup', () => {
			expect(nock.pendingMocks()).toHaveLength(6);
		});
	});
});
