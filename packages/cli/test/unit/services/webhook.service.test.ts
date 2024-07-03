import { v4 as uuid } from 'uuid';
import config from '@/config';
import { WebhookRepository } from '@db/repositories/webhook.repository';
import { CacheService } from '@/services/cache/cache.service';
import { WebhookService } from '@/services/webhook.service';
import { WebhookEntity } from '@db/entities/WebhookEntity';
import { mockInstance } from '../../shared/mocking';

const createWebhook = (method: string, path: string, webhookId?: string, pathSegments?: number) =>
	Object.assign(new WebhookEntity(), {
		method,
		webhookPath: path,
		webhookId,
		pathSegments,
	}) as WebhookEntity;

describe('WebhookService', () => {
	const webhookRepository = mockInstance(WebhookRepository);
	const cacheService = mockInstance(CacheService);
	const webhookService = new WebhookService(webhookRepository, cacheService);

	beforeEach(() => {
		config.load(config.default);
		jest.clearAllMocks();
	});

	[true, false].forEach((isCacheEnabled) => {
		const tag = '[' + ['cache', isCacheEnabled ? 'enabled' : 'disabled'].join(' ') + ']';

		describe(`findWebhook() - static case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const path = 'user/profile';
				const mockWebhook = createWebhook(method, path);

				webhookRepository.findOneBy.mockResolvedValue(mockWebhook);

				const returnedWebhook = await webhookService.findWebhook(method, path);

				expect(returnedWebhook).toBe(mockWebhook);
			});

			test('should return null if not found', async () => {
				webhookRepository.findOneBy.mockResolvedValue(null); // static
				webhookRepository.findBy.mockResolvedValue([]);

				const returnValue = await webhookService.findWebhook('GET', 'user/profile');

				expect(returnValue).toBeNull();
			});
		});

		describe(`findWebhook() - dynamic case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const webhookId = uuid();
				const path = 'user/:id/posts';
				const mockWebhook = createWebhook(method, path, webhookId, 3);

				webhookRepository.findOneBy.mockResolvedValue(null); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook]); // dynamic

				const returnedWebhook = await webhookService.findWebhook(
					method,
					[webhookId, 'user/123/posts'].join('/'),
				);

				expect(returnedWebhook).toBe(mockWebhook);
			});

			test('should handle subset dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = uuid();
				const path1 = 'user/:id/posts';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);

				const method2 = 'GET';
				const webhookId2 = uuid();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);

				webhookRepository.findOneBy.mockResolvedValue(null); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]); // dynamic

				const fullPath1 = [webhookId1, 'user/123/posts'].join('/');
				const returnedWebhook1 = await webhookService.findWebhook(method1, fullPath1);

				const fullPath2 = [webhookId1, 'user/123/posts/456/comments'].join('/');
				const returnedWebhook2 = await webhookService.findWebhook(method2, fullPath2);

				expect(returnedWebhook1).toBe(mockWebhook1);
				expect(returnedWebhook2).toBe(mockWebhook2);
			});

			test('should handle single-segment dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = uuid();
				const path1 = ':var';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);

				const method2 = 'GET';
				const webhookId2 = uuid();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);

				webhookRepository.findOneBy.mockResolvedValue(null); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]); // dynamic

				const fullPath = [webhookId1, 'user/123/posts/456'].join('/');
				const returnedWebhook = await webhookService.findWebhook(method1, fullPath);

				expect(returnedWebhook).toBe(mockWebhook1);
			});

			test('should return null if not found', async () => {
				const fullPath = [uuid(), 'user/:id/posts'].join('/');

				webhookRepository.findOneBy.mockResolvedValue(null); // static
				webhookRepository.findBy.mockResolvedValue([]); // dynamic

				const returnValue = await webhookService.findWebhook('GET', fullPath);

				expect(returnValue).toBeNull();
			});
		});
	});

	describe('getWebhookMethods()', () => {
		test('should return all methods for webhook', async () => {
			const path = 'user/profile';

			webhookRepository.find.mockResolvedValue([
				createWebhook('GET', path),
				createWebhook('POST', path),
				createWebhook('PUT', path),
				createWebhook('PATCH', path),
			]);

			const returnedMethods = await webhookService.getWebhookMethods(path);

			expect(returnedMethods).toEqual(['GET', 'POST', 'PUT', 'PATCH']);
		});

		test('should return empty array if no webhooks found', async () => {
			webhookRepository.find.mockResolvedValue([]);

			const returnedMethods = await webhookService.getWebhookMethods('user/profile');

			expect(returnedMethods).toEqual([]);
		});
	});

	describe('deleteWorkflowWebhooks()', () => {
		test('should delete all webhooks of the workflow', async () => {
			const mockWorkflowWebhooks = [
				createWebhook('PUT', 'users'),
				createWebhook('GET', 'user/:id'),
				createWebhook('POST', ':var'),
			];

			webhookRepository.findBy.mockResolvedValue(mockWorkflowWebhooks);

			const workflowId = uuid();

			await webhookService.deleteWorkflowWebhooks(workflowId);

			expect(webhookRepository.remove).toHaveBeenCalledWith(mockWorkflowWebhooks);
		});

		test('should not delete any webhooks if none found', async () => {
			webhookRepository.findBy.mockResolvedValue([]);

			const workflowId = uuid();

			await webhookService.deleteWorkflowWebhooks(workflowId);

			expect(webhookRepository.remove).toHaveBeenCalledWith([]);
		});
	});

	describe('createWebhook()', () => {
		test('should create the webhook', async () => {
			const mockWebhook = createWebhook('GET', 'user/:id');

			await webhookService.storeWebhook(mockWebhook);

			expect(webhookRepository.insert).toHaveBeenCalledWith(mockWebhook);
		});
	});
});
