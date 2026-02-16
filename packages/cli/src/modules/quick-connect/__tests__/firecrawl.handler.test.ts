import type { User } from '@n8n/db';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import { FirecrawlHandler } from '../handlers/firecrawl.handler';
import type { QuickConnectBackendOption } from '../quick-connect.config';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FirecrawlHandler', () => {
	let handler: FirecrawlHandler;

	const mockUser = mock<User>({ email: 'test@example.com' });

	const mockConfig: QuickConnectBackendOption = {
		packageName: '@n8n/firecrawl-package',
		credentialType: 'firecrawlApi',
		text: 'Connect with Firecrawl',
		quickConnectType: 'backend',
		serviceName: 'Firecrawl',
		backendFlowConfig: {
			secret: 'secret',
		},
	};

	beforeEach(() => {
		jest.resetAllMocks();
		handler = new FirecrawlHandler();
	});

	describe('credentialType', () => {
		it('should have the correct credential type', () => {
			expect(handler.credentialType).toBe('firecrawlApi');
		});
	});

	describe('getCredentialData', () => {
		it('should successfully fetch credential data from Firecrawl API', async () => {
			const expectedApiKey = 'fc-api-key-12345';
			mockedAxios.post.mockResolvedValue({
				data: { apiKey: expectedApiKey },
			});

			const result = await handler.getCredentialData(mockConfig, mockUser);

			expect(result).toEqual({ apiKey: expectedApiKey });
			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://api.firecrawl.dev/admin/integration/create-user',
				{ email: 'test@example.com' },
				{
					headers: {
						Authorization: 'Bearer secret',
						'Content-Type': 'application/json',
					},
				},
			);
		});

		it('should propagate error from Firecrawl API', async () => {
			const unauthorizedError = new Error('Unauthorized');
			mockedAxios.post.mockRejectedValue(unauthorizedError);

			await expect(handler.getCredentialData(mockConfig, mockUser)).rejects.toThrow('Unauthorized');
		});
	});
});
