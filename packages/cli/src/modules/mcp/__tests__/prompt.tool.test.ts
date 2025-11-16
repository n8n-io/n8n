import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { createPromptTool } from '../tools/prompt.tool';

import type { DataStoreService } from '@/modules/data-table/data-store.service';

describe('PromptTool', () => {
	const mockUser = mock<User>({ id: 'user123' });
	const mockDataStoreService = mock<DataStoreService>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('create operation', () => {
		it('should create a new prompt', async () => {
			const projectId = 'project123';
			const promptName = 'test-prompt';
			const content = 'You are a helpful assistant';

			// Mock table exists
			mockDataStoreService.getManyAndCount.mockResolvedValue({
				data: [{ id: 'table123', name: 'mcp_prompts', projectId }],
				count: 1,
			});

			// Mock no existing prompt
			mockDataStoreService.getManyRowsAndCount.mockResolvedValue({
				data: [],
				count: 0,
			});

			// Mock insert
			mockDataStoreService.insertRows.mockResolvedValue([
				{
					id: 'prompt123',
					name: promptName,
					content,
					description: '',
					category: 'general',
					tags: '',
					version: '1.0.0',
					availableInMCP: true,
					isPublic: false,
				},
			]);

			const tool = createPromptTool(mockUser, mockDataStoreService);

			const result = await tool.handler({
				operation: 'create',
				projectId,
				promptName,
				content,
			});

			expect(result.content).toHaveLength(1);
			const response = JSON.parse(result.content[0].text);
			expect(response.success).toBe(true);
			expect(response.message).toContain('created successfully');
		});

		it('should throw error if promptName is missing', async () => {
			const tool = createPromptTool(mockUser, mockDataStoreService);

			mockDataStoreService.getManyAndCount.mockResolvedValue({
				data: [{ id: 'table123', name: 'mcp_prompts', projectId: 'project123' }],
				count: 1,
			});

			const result = await tool.handler({
				operation: 'create',
				projectId: 'project123',
				content: 'Test content',
			});

			const response = JSON.parse(result.content[0].text);
			expect(response.success).toBe(false);
			expect(response.message).toContain('promptName and content are required');
		});
	});

	describe('search operation', () => {
		it('should search prompts by query', async () => {
			const projectId = 'project123';

			mockDataStoreService.getManyAndCount.mockResolvedValue({
				data: [{ id: 'table123', name: 'mcp_prompts', projectId }],
				count: 1,
			});

			mockDataStoreService.getManyRowsAndCount.mockResolvedValue({
				data: [
					{
						id: 'prompt1',
						name: 'python-helper',
						content: 'Help with Python',
						description: 'Python programming assistant',
						category: 'coding',
						tags: 'python,programming',
						version: '1.0.0',
						availableInMCP: true,
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
					{
						id: 'prompt2',
						name: 'javascript-helper',
						content: 'Help with JS',
						description: 'JavaScript assistant',
						category: 'coding',
						tags: 'javascript,programming',
						version: '1.0.0',
						availableInMCP: true,
						createdAt: '2025-01-01',
						updatedAt: '2025-01-01',
					},
				],
				count: 2,
			});

			const tool = createPromptTool(mockUser, mockDataStoreService);

			const result = await tool.handler({
				operation: 'search',
				projectId,
				searchQuery: 'python',
			});

			const response = JSON.parse(result.content[0].text);
			expect(response.success).toBe(true);
			expect(response.data.prompts).toHaveLength(1);
			expect(response.data.prompts[0].name).toBe('python-helper');
		});
	});

	describe('update operation', () => {
		it('should update an existing prompt', async () => {
			const projectId = 'project123';
			const promptName = 'test-prompt';

			mockDataStoreService.getManyAndCount.mockResolvedValue({
				data: [{ id: 'table123', name: 'mcp_prompts', projectId }],
				count: 1,
			});

			mockDataStoreService.updateRows.mockResolvedValue([
				{
					id: 'prompt123',
					name: promptName,
					content: 'Updated content',
					version: '1.1.0',
				},
			]);

			const tool = createPromptTool(mockUser, mockDataStoreService);

			const result = await tool.handler({
				operation: 'update',
				projectId,
				promptName,
				content: 'Updated content',
				version: '1.1.0',
			});

			const response = JSON.parse(result.content[0].text);
			expect(response.success).toBe(true);
			expect(response.message).toContain('updated successfully');
		});
	});

	describe('delete operation', () => {
		it('should delete a prompt', async () => {
			const projectId = 'project123';
			const promptName = 'test-prompt';

			mockDataStoreService.getManyAndCount.mockResolvedValue({
				data: [{ id: 'table123', name: 'mcp_prompts', projectId }],
				count: 1,
			});

			mockDataStoreService.deleteRows.mockResolvedValue([
				{
					id: 'prompt123',
					name: promptName,
				},
			]);

			const tool = createPromptTool(mockUser, mockDataStoreService);

			const result = await tool.handler({
				operation: 'delete',
				projectId,
				promptName,
			});

			const response = JSON.parse(result.content[0].text);
			expect(response.success).toBe(true);
			expect(response.message).toContain('deleted successfully');
		});
	});
});
