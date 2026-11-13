import type { INode, RequestPath } from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';

export function assertBucketName(node: INode, bucketName: string) {
	if (!/^[A-Za-z0-9._-]+$/.test(bucketName)) {
		throw new NodeOperationError(node, `Invalid bucket name: "${bucketName}"`, {
			description:
				'A bucket name can only contain letters, numbers, periods (.), hyphens (-) and underscores (_)',
		});
	}
}

export function bucketTarget(node: INode, bucketName: string) {
	assertBucketName(node, bucketName);
	return bucketName.includes('.')
		? { servicePath: 's3', basePath: requestPath`/${bucketName}` }
		: { servicePath: `${bucketName}.s3`, basePath: requestPath`` };
}

function decodeEscapes(part: string): string {
	return part.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
		try {
			return decodeURIComponent(run);
		} catch {
			return run;
		}
	});
}

export function objectKeyPath(key: string): RequestPath {
	return key
		.split(/[/\\]/)
		.reduce(
			(path, part) => (part ? requestPath`${path}/${decodeEscapes(part)}` : requestPath`${path}/`),
			requestPath``,
		);
}
