import { mock } from 'vitest-mock-extended';
import type { IRestApiContext } from '@n8n/rest-api-client';
import * as restApiClient from '@n8n/rest-api-client';

import type { InstanceAiGenerateSampleDataResponse } from '@n8n/api-types';

import { generateSampleData } from '../instanceAi.api';
import type { GenerateSampleDataRequest } from '../instanceAi.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<typeof restApiClient>()),
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = mock<IRestApiContext>();

describe('instanceAi.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('generateSampleData', () => {
		it('posts the payload to the sample data endpoint and returns the response', async () => {
			const response: InstanceAiGenerateSampleDataResponse = {
				pinData: { 'My Node': [{ json: { id: 1 } }] },
			};
			vi.mocked(restApiClient.makeRestApiRequest).mockResolvedValue(response);

			const payload: GenerateSampleDataRequest = {
				workflow: { name: 'My workflow', nodes: [], connections: {} },
				nodeNames: ['My Node'],
			};

			const result = await generateSampleData(restApiContext, payload);

			expect(restApiClient.makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'POST',
				'/instance-ai/sample-data/generate',
				payload,
			);
			expect(result).toEqual(response);
		});

		it('surfaces the field-drift warning from the response', async () => {
			const response: InstanceAiGenerateSampleDataResponse = {
				pinData: { 'My Node': [{ json: { id: 1 } }] },
				warning: 'field-drift',
			};
			vi.mocked(restApiClient.makeRestApiRequest).mockResolvedValue(response);

			const result = await generateSampleData(restApiContext, {
				workflow: { nodes: [], connections: {} },
				nodeNames: ['My Node'],
			});

			expect(result.warning).toBe('field-drift');
		});
	});
});
