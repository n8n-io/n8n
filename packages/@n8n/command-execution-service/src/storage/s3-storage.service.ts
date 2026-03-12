import {
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import s3Config from '../config/s3.config';
import type { S3Object } from '../types';

@Injectable()
export class S3StorageService {
	private client: S3Client;

	private readonly bucket: string;

	constructor(@Inject(s3Config.KEY) private readonly config: ConfigType<typeof s3Config>) {
		this.bucket = config.bucket;
		this.client = new S3Client(this.getClientConfig());
	}

	private getClientConfig(): S3ClientConfig {
		const clientConfig: S3ClientConfig = {
			region: this.config.region,
		};

		if (this.config.endpoint) {
			clientConfig.endpoint = this.config.endpoint;
			clientConfig.forcePathStyle = true;
		}

		if (!this.config.authAutoDetect) {
			clientConfig.credentials = {
				accessKeyId: this.config.accessKey,
				secretAccessKey: this.config.secretKey,
			};
		}

		return clientConfig;
	}

	async checkConnection(): Promise<void> {
		await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
	}

	async putObject(key: string, body: Buffer | string): Promise<void> {
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
			}),
		);
	}

	async getObject(key: string): Promise<Buffer> {
		const response = await this.client.send(
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			}),
		);

		const stream = response.Body;
		if (!stream) {
			return Buffer.alloc(0);
		}

		const chunks: Buffer[] = [];
		for await (const chunk of stream as AsyncIterable<Buffer>) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async listObjects(prefix: string): Promise<S3Object[]> {
		const objects: S3Object[] = [];
		let continuationToken: string | undefined;

		do {
			const response = await this.client.send(
				new ListObjectsV2Command({
					Bucket: this.bucket,
					Prefix: prefix,
					ContinuationToken: continuationToken,
				}),
			);

			if (response.Contents) {
				for (const obj of response.Contents) {
					if (obj.Key && obj.Size !== undefined) {
						objects.push({
							key: obj.Key,
							size: obj.Size,
							lastModified: obj.LastModified,
						});
					}
				}
			}

			continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
		} while (continuationToken);

		return objects;
	}

	async deleteObjects(keys: string[]): Promise<void> {
		if (keys.length === 0) return;

		const batchSize = 1000;
		for (let i = 0; i < keys.length; i += batchSize) {
			const batch = keys.slice(i, i + batchSize);
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: batch.map((key) => ({ Key: key })),
						Quiet: true,
					},
				}),
			);
		}
	}

	async deletePrefix(prefix: string): Promise<void> {
		const objects = await this.listObjects(prefix);

		if (objects.length === 0) return;

		const batchSize = 1000;
		for (let i = 0; i < objects.length; i += batchSize) {
			const batch = objects.slice(i, i + batchSize);
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: batch.map((obj) => ({ Key: obj.key })),
						Quiet: true,
					},
				}),
			);
		}
	}

	/**
	 * Create a "prefix" in S3 by writing a zero-byte marker object.
	 * S3 doesn't have real directories, but this ensures the prefix is discoverable.
	 */
	async createPrefix(prefix: string): Promise<void> {
		await this.putObject(`${prefix}.n8n-volume.manifest.json`, '');
	}

	/**
	 * List distinct volume prefixes under the given root prefix.
	 * Looks for `.n8n-volume.manifest.json` marker files.
	 */
	async listPrefixes(rootPrefix: string): Promise<string[]> {
		const objects = await this.listObjects(rootPrefix);
		const prefixes: string[] = [];

		for (const obj of objects) {
			if (obj.key.endsWith('.n8n-volume.manifest.json')) {
				const prefix = obj.key.slice(0, -'.n8n-volume.manifest.json'.length);
				prefixes.push(prefix);
			}
		}

		return prefixes;
	}
}
