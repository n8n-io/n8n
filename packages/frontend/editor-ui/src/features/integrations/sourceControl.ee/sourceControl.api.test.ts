import { vi } from 'vitest';
import { pushWorkfolder } from './sourceControl.api';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { PushWorkFolderRequestDto } from '@n8n/api-types';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

import { makeRestApiRequest } from '@n8n/rest-api-client';

describe('sourceControl.api', () => {
	const mockContext = {} as IRestApiContext;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('pushWorkfolder', () => {
		it('should call makeRestApiRequest with correct parameters and return result', async () => {
			const mockResponse = {
				files: [{ file: 'test.json', status: 'modified' }],
				commit: { hash: 'abc123', message: 'Test commit', branch: 'main' },
			};

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockResponse);

			const data: PushWorkFolderRequestDto = {
				commitMessage: 'Test commit',
				fileNames: [],
				force: false,
			};

			const result = await pushWorkfolder(mockContext, data);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'POST',
				'/source-control/push-workfolder',
				data,
			);
			expect(result).toEqual(mockResponse);
		});
	});
});
