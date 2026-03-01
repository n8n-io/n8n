import { generateUrlSignature } from '../signature-helpers';

describe('signature-helpers', () => {
	const secret = 'test-secret';
	const baseUrl = 'http://localhost:5678';

	describe('generateUrlSignature', () => {
		it('should generate a signature token', () => {
			const url = `${baseUrl}/webhook/abc`;
			const token = generateUrlSignature(url, secret);
			expect(token).toBe('fe7f1e4c11f875b2d24681e0b28d0bfed6d66381af5b0ab9633da2202a895243');
		});

		it('should generate a different token for a different url', () => {
			const url = `${baseUrl}/webhook/def`;
			const token = generateUrlSignature(url, secret);
			expect(token).toBe('ab8e72e7a0e47689596a6550283cbef9e2797b7370b0d6d99c89ee7c2394ea8f');
		});

		it('should generate a different token for a different secret', () => {
			const url = `${baseUrl}/webhook/abc`;
			const token = generateUrlSignature(url, 'different-secret');
			expect(token).toBe('84a99b6950e12ffcf1fcf8e0fc0986c0c8a46df331932efd79b17e0c11801bd2');
		});
	});
});
