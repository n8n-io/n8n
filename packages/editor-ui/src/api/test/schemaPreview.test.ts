import { getSchemaPreview } from '../schemaPreview';
import * as apiUtils from '@/utils/apiUtils';

describe('schemaPreview', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	vi.mock('@/utils/apiUtils', () => ({
		request: vi.fn().mockResolvedValue({ test: 'test' }),
	}));

	it('should return schema preview', async () => {
		const response = await getSchemaPreview('http://test.com', {
			nodeType: 'n8n-nodes-base.asana',
			version: 1,
			resource: 'resource',
			operation: 'operation',
		});

		expect(response).toEqual({ test: 'test' });
	});

	it('should parse out nodeType', async () => {
		const spy = vi.spyOn(apiUtils, 'request');

		await getSchemaPreview('http://test.com', {
			nodeType: '@n8n/n8n-nodes-base.asana',
			version: 1,
			resource: 'resource',
			operation: 'operation',
		});

		expect(spy).toHaveBeenCalledWith({
			method: 'GET',
			baseURL: 'http://test.com',
			endpoint: 'schemas/n8n-nodes-base.asana/1.0.0/resource/operation.json',
			withCredentials: false,
		});
	});
});
