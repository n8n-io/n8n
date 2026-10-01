import { jsonRequestBody } from '../json.request-body';
import { multipartRequestBody } from '../multipart.request-body';
import { type RequestBodyHandler, requestBodyHandlerFor } from '../index';
import type { RequestBodyMedia } from '@n8n/decorators';

describe('requestBodyHandlerFor', () => {
	it.each<[RequestBodyMedia, RequestBodyHandler]>([
		[{ mediaType: 'application/json' }, jsonRequestBody],
		[{ mediaType: 'multipart/form-data', uploadLimits: () => ({}) }, multipartRequestBody],
	])('resolves the handler for $mediaType', (media, handler) => {
		expect(requestBodyHandlerFor(media)).toBe(handler);
	});
});
