import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { assertBucketName, bucketTarget, objectKeyPath } from '../utils';

describe('AWS S3 utils', () => {
	const node = mock<INode>();

	describe('objectKeyPath', () => {
		it('should encode each key segment and keep the separators', () => {
			expect(objectKeyPath('reports/2024 q1?x=1#top/a+b:c.pdf').value).toBe(
				'/reports/2024%20q1%3Fx=1%23top/a%2Bb:c.pdf',
			);
		});

		it('should decode escapes in a key part before it encodes the part', () => {
			expect(objectKeyPath('docs/report%20final.pdf').value).toBe('/docs/report%20final.pdf');
			expect(objectKeyPath('50%20off%.txt').value).toBe('/50%20off%25.txt');
			expect(objectKeyPath('a%2Fb').value).toBe('/a%2Fb');
		});

		it('should keep empty segments and a trailing slash', () => {
			expect(objectKeyPath('archive//old/').value).toBe('/archive//old/');
		});

		it('should reject dot segments', () => {
			expect(() => objectKeyPath('a/../b')).toThrow();
		});
	});

	describe('assertBucketName', () => {
		it.each(['orders-archive', 'logs.example.com', 'Legacy_Bucket'])(
			'should accept "%s"',
			(bucketName) => {
				expect(() => assertBucketName(node, bucketName)).not.toThrow();
			},
		);

		it.each([
			'',
			'archive.example.com/x',
			'bucket#',
			'bucket?x',
			'user@bucket',
			'bucket:80',
			'my bucket',
		])('should reject "%s"', (bucketName) => {
			expect(() => assertBucketName(node, bucketName)).toThrow(NodeOperationError);
		});
	});

	describe('bucketTarget', () => {
		it('should use the bucket host for names without a dot', () => {
			const target = bucketTarget(node, 'orders-archive');
			expect(target.servicePath).toBe('orders-archive.s3');
			expect(target.basePath.value).toBe('');
		});

		it('should use the bucket path for names with a dot', () => {
			const target = bucketTarget(node, 'logs.example.com');
			expect(target.servicePath).toBe('s3');
			expect(target.basePath.value).toBe('/logs.example.com');
		});
	});
});
