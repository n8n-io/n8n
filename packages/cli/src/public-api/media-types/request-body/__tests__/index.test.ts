import { jsonRequestBody } from '../json.request-body';
import { multipartRequestBody } from '../multipart.request-body';
import { JSON_REQUEST_BODY_MEDIA, REQUEST_BODY_HANDLERS, requestBodyHandlerFor } from '../index';

describe('REQUEST_BODY_HANDLERS', () => {
	it('has one handler per declarable media type', () => {
		expect(REQUEST_BODY_HANDLERS['application/json']).toBe(jsonRequestBody);
		expect(REQUEST_BODY_HANDLERS['multipart/form-data']).toBe(multipartRequestBody);
	});
});

describe('JSON_REQUEST_BODY_MEDIA', () => {
	it('is the application/json media type', () => {
		expect(JSON_REQUEST_BODY_MEDIA).toEqual({ mediaType: 'application/json' });
	});
});

describe('requestBodyHandlerFor', () => {
	it('resolves the JSON handler', () => {
		expect(requestBodyHandlerFor({ mediaType: 'application/json' })).toBe(jsonRequestBody);
	});

	it('resolves the multipart handler', () => {
		expect(
			requestBodyHandlerFor({ mediaType: 'multipart/form-data', uploadLimits: () => ({}) }),
		).toBe(multipartRequestBody);
	});
});
