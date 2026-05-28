import type { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

import { generateContentLengthHeader, isFormDataInstance } from '../request-helpers/axios-utils';

describe('isFormDataInstance', () => {
	it('should return true for a real FormData instance', () => {
		const formData = new FormData();
		expect(isFormDataInstance(formData)).toBe(true);
	});

	it('should return true for a duck-typed FormData (different module copy)', () => {
		const fakeFormData = {
			getHeaders: () => ({ 'content-type': 'multipart/form-data; boundary=---test' }),
			append: () => {},
		};
		expect(isFormDataInstance(fakeFormData)).toBe(true);
	});

	it('should return false for null', () => {
		expect(isFormDataInstance(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isFormDataInstance(undefined)).toBe(false);
	});

	it('should return false for a plain object', () => {
		expect(isFormDataInstance({ key: 'value' })).toBe(false);
	});

	it('should return false for a string', () => {
		expect(isFormDataInstance('form-data')).toBe(false);
	});

	it('should return false for an object with only getHeaders', () => {
		expect(isFormDataInstance({ getHeaders: () => ({}) })).toBe(false);
	});

	it('should return false for an object with only append', () => {
		expect(isFormDataInstance({ append: () => {} })).toBe(false);
	});
});

describe('generateContentLengthHeader', () => {
	it('should set content-length for FormData with buffer values', async () => {
		const formData = new FormData();
		formData.append('file', Buffer.from('test-content'), {
			filename: 'test.txt',
			contentType: 'text/plain',
		});

		const config: AxiosRequestConfig = { data: formData, headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers?.['content-length']).toBeGreaterThan(0);
	});

	it('should set content-length for FormData with stream and knownLength', async () => {
		const formData = new FormData();
		const stream = Readable.from(Buffer.from('test-content'));
		formData.append('file', stream, {
			filename: 'test.txt',
			contentType: 'text/plain',
			knownLength: 12,
		});

		const config: AxiosRequestConfig = { data: formData, headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers?.['content-length']).toBeGreaterThan(0);
	});

	it('should not throw for FormData with stream without knownLength', async () => {
		const formData = new FormData();
		const stream = Readable.from(Buffer.from('test-content'));
		formData.append('file', stream, {
			filename: 'test.txt',
			contentType: 'text/plain',
		});

		const config: AxiosRequestConfig = { data: formData, headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers?.['content-length']).toBeUndefined();
	});

	it('should skip non-FormData data', async () => {
		const config: AxiosRequestConfig = { data: 'plain string', headers: {} };
		await generateContentLengthHeader(config);

		expect(config.headers?.['content-length']).toBeUndefined();
	});
});
