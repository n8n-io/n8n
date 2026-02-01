import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import {
	createWebhook,
	deleteWebhook,
	findWebhookByUrl,
	generateWebhookSecret,
	isTimestampValid,
	listWebhooks,
	updateWebhook,
	verifyWebhook,
} from '../CurrentsTriggerHelpers';

describe('CurrentsTriggerHelpers', () => {
	describe('isTimestampValid', () => {
		it('should return true for current timestamp in milliseconds', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const nowMs = nowSec * 1000;
			expect(isTimestampValid(nowMs, nowSec)).toBe(true);
		});

		it('should return true for timestamp within 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const fourMinutesAgoMs = (nowSec - 240) * 1000;
			expect(isTimestampValid(fourMinutesAgoMs, nowSec)).toBe(true);
		});

		it('should return false for timestamp older than 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const sixMinutesAgoMs = (nowSec - 360) * 1000;
			expect(isTimestampValid(sixMinutesAgoMs, nowSec)).toBe(false);
		});

		it('should return false for timestamp from the future beyond tolerance', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const sixMinutesInFutureMs = (nowSec + 360) * 1000;
			expect(isTimestampValid(sixMinutesInFutureMs, nowSec)).toBe(false);
		});

		it('should return true for timestamp at exactly 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const fiveMinutesAgoMs = (nowSec - 300) * 1000;
			expect(isTimestampValid(fiveMinutesAgoMs, nowSec)).toBe(true);
		});
	});

	describe('generateWebhookSecret', () => {
		it('should generate a 64-character hex string', () => {
			const secret = generateWebhookSecret();
			expect(secret).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
		});

		it('should generate unique secrets', () => {
			const secret1 = generateWebhookSecret();
			const secret2 = generateWebhookSecret();
			expect(secret1).not.toBe(secret2);
		});
	});

	describe('verifyWebhook', () => {
		let mockWebhookFunctions: Partial<IWebhookFunctions>;

		beforeEach(() => {
			mockWebhookFunctions = {
				getRequestObject: jest.fn(),
				getHeaderData: jest.fn(),
				getWorkflowStaticData: jest.fn(),
			};
		});

		it('should return true when no secret in static data (no verification)', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when timestamp is stale', () => {
			const tenMinutesAgoMs = Date.now() - 600 * 1000;

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(tenMinutesAgoMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when timestamp is invalid/non-numeric', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': 'not-a-number' },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return true when secret matches from static data', () => {
			const nowMs = Date.now();
			const secret = 'auto-generated-secret';

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': secret,
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: secret,
			} as IDataObject);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when secret does not match (different length)', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'wrong-secret',
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-secret',
			} as IDataObject);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when secret does not match (same length)', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'wrong-secret-aa',
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-secret',
			} as IDataObject);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when secret header is missing but expected', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			} as IDataObject);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should handle missing timestamp header gracefully', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: {},
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});
	});

	describe('listWebhooks', () => {
		let mockHookFunctions: Partial<IHookFunctions>;

		beforeEach(() => {
			mockHookFunctions = {
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				} as unknown as IHookFunctions['helpers'],
			};
		});

		it('should return webhooks from API response', async () => {
			const mockWebhooks = [
				{
					hookId: 'hook-1',
					projectId: 'project-123',
					url: 'https://example.com/webhook1',
					hookEvents: ['RUN_FINISH'],
				},
				{
					hookId: 'hook-2',
					projectId: 'project-123',
					url: 'https://example.com/webhook2',
					hookEvents: ['RUN_START', 'RUN_FINISH'],
				},
			];

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: mockWebhooks,
			});

			const result = await listWebhooks.call(mockHookFunctions as IHookFunctions, 'project-123');

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'GET',
					url: 'https://api.currents.dev/v1/webhooks',
					qs: { projectId: 'project-123' },
				},
			);
			expect(result).toEqual(mockWebhooks);
		});

		it('should return empty array when no webhooks exist', async () => {
			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: null,
			});

			const result = await listWebhooks.call(mockHookFunctions as IHookFunctions, 'project-123');

			expect(result).toEqual([]);
		});
	});

	describe('findWebhookByUrl', () => {
		let mockHookFunctions: Partial<IHookFunctions>;

		beforeEach(() => {
			mockHookFunctions = {
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				} as unknown as IHookFunctions['helpers'],
			};
		});

		it('should find webhook matching URL', async () => {
			const targetUrl = 'https://example.com/webhook2';
			const mockWebhooks = [
				{
					hookId: 'hook-1',
					projectId: 'project-123',
					url: 'https://example.com/webhook1',
					hookEvents: ['RUN_FINISH'],
				},
				{
					hookId: 'hook-2',
					projectId: 'project-123',
					url: targetUrl,
					hookEvents: ['RUN_START'],
				},
			];

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: mockWebhooks,
			});

			const result = await findWebhookByUrl.call(
				mockHookFunctions as IHookFunctions,
				'project-123',
				targetUrl,
			);

			expect(result).toEqual(mockWebhooks[1]);
		});

		it('should return undefined when no webhook matches URL', async () => {
			const mockWebhooks = [
				{
					hookId: 'hook-1',
					projectId: 'project-123',
					url: 'https://example.com/webhook1',
					hookEvents: ['RUN_FINISH'],
				},
			];

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: mockWebhooks,
			});

			const result = await findWebhookByUrl.call(
				mockHookFunctions as IHookFunctions,
				'project-123',
				'https://example.com/nonexistent',
			);

			expect(result).toBeUndefined();
		});
	});

	describe('createWebhook', () => {
		let mockHookFunctions: Partial<IHookFunctions>;

		beforeEach(() => {
			mockHookFunctions = {
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				} as unknown as IHookFunctions['helpers'],
			};
		});

		it('should create webhook with all options', async () => {
			const createdWebhook = {
				hookId: 'new-hook-id',
				projectId: 'project-123',
				url: 'https://example.com/webhook',
				hookEvents: ['RUN_FINISH', 'RUN_START'],
				headers: '{"x-webhook-secret":"secret123"}',
				label: 'n8n workflow 456',
			};

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: createdWebhook,
			});

			const result = await createWebhook.call(mockHookFunctions as IHookFunctions, 'project-123', {
				url: 'https://example.com/webhook',
				hookEvents: ['RUN_FINISH', 'RUN_START'],
				headers: '{"x-webhook-secret":"secret123"}',
				label: 'n8n workflow 456',
			});

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'POST',
					url: 'https://api.currents.dev/v1/webhooks',
					qs: { projectId: 'project-123' },
					body: {
						url: 'https://example.com/webhook',
						hookEvents: ['RUN_FINISH', 'RUN_START'],
						headers: '{"x-webhook-secret":"secret123"}',
						label: 'n8n workflow 456',
					},
				},
			);
			expect(result).toEqual(createdWebhook);
		});

		it('should create webhook with minimal options', async () => {
			const createdWebhook = {
				hookId: 'new-hook-id',
				projectId: 'project-123',
				url: 'https://example.com/webhook',
				hookEvents: [],
			};

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: createdWebhook,
			});

			const result = await createWebhook.call(mockHookFunctions as IHookFunctions, 'project-123', {
				url: 'https://example.com/webhook',
			});

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'POST',
					url: 'https://api.currents.dev/v1/webhooks',
					qs: { projectId: 'project-123' },
					body: {
						url: 'https://example.com/webhook',
						hookEvents: [],
						headers: undefined,
						label: undefined,
					},
				},
			);
			expect(result).toEqual(createdWebhook);
		});
	});

	describe('updateWebhook', () => {
		let mockHookFunctions: Partial<IHookFunctions>;

		beforeEach(() => {
			mockHookFunctions = {
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				} as unknown as IHookFunctions['helpers'],
			};
		});

		it('should update webhook with new events', async () => {
			const updatedWebhook = {
				hookId: 'hook-123',
				projectId: 'project-123',
				url: 'https://example.com/webhook',
				hookEvents: ['RUN_FINISH', 'RUN_TIMEOUT'],
			};

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: updatedWebhook,
			});

			const result = await updateWebhook.call(mockHookFunctions as IHookFunctions, 'hook-123', {
				hookEvents: ['RUN_FINISH', 'RUN_TIMEOUT'],
			});

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'PUT',
					url: 'https://api.currents.dev/v1/webhooks/hook-123',
					body: {
						hookEvents: ['RUN_FINISH', 'RUN_TIMEOUT'],
					},
				},
			);
			expect(result).toEqual(updatedWebhook);
		});

		it('should update webhook with multiple fields', async () => {
			const updatedWebhook = {
				hookId: 'hook-123',
				projectId: 'project-123',
				url: 'https://example.com/new-webhook',
				hookEvents: ['RUN_START'],
				headers: '{"x-webhook-secret":"newsecret"}',
				label: 'updated label',
			};

			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				data: updatedWebhook,
			});

			const result = await updateWebhook.call(mockHookFunctions as IHookFunctions, 'hook-123', {
				url: 'https://example.com/new-webhook',
				hookEvents: ['RUN_START'],
				headers: '{"x-webhook-secret":"newsecret"}',
				label: 'updated label',
			});

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'PUT',
					url: 'https://api.currents.dev/v1/webhooks/hook-123',
					body: {
						url: 'https://example.com/new-webhook',
						hookEvents: ['RUN_START'],
						headers: '{"x-webhook-secret":"newsecret"}',
						label: 'updated label',
					},
				},
			);
			expect(result).toEqual(updatedWebhook);
		});
	});

	describe('deleteWebhook', () => {
		let mockHookFunctions: Partial<IHookFunctions>;

		beforeEach(() => {
			mockHookFunctions = {
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				} as unknown as IHookFunctions['helpers'],
			};
		});

		it('should delete webhook by hookId', async () => {
			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({});

			await deleteWebhook.call(mockHookFunctions as IHookFunctions, 'hook-123');

			expect(mockHookFunctions.helpers!.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'currentsApi',
				{
					method: 'DELETE',
					url: 'https://api.currents.dev/v1/webhooks/hook-123',
				},
			);
		});

		it('should not throw on successful deletion', async () => {
			(mockHookFunctions.helpers!.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({});

			await expect(
				deleteWebhook.call(mockHookFunctions as IHookFunctions, 'hook-123'),
			).resolves.toBeUndefined();
		});
	});
});
