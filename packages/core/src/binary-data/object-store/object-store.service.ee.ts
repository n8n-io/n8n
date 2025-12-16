import type {
	PutObjectCommandInput,
	DeleteObjectsCommandInput,
	ListObjectsV2CommandInput,
	S3ClientConfig,
} from '@aws-sdk/client-s3';
import {
	S3Client,
	HeadBucketCommand,
	PutObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import { ObjectStoreConfig } from './object-store.config';
import type { MetadataResponseHeaders } from './types';
import type { BinaryData } from '../types';
import { streamToBuffer } from '../utils';

@Service()
export class ObjectStoreService {
	private s3Client: S3Client;

	private isReady = false;

	private bucket: string;

	constructor(
		private readonly logger: Logger,
		private readonly s3Config: ObjectStoreConfig,
	) {
		const { bucket } = s3Config;
		if (bucket.name === '') {
			throw new UnexpectedError(
				'External storage bucket name not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME`.',
			);
		}

		this.bucket = bucket.name;
		this.s3Client = new S3Client(this.getClientConfig());
	}

	/** This generates the config for the S3Client to make it work in all various auth configurations */
	getClientConfig() {
		const { host, bucket, protocol, credentials } = this.s3Config;
		const clientConfig: S3ClientConfig = {};
		const endpoint = host ? `${protocol}://${host}` : undefined;
		if (endpoint) {
			clientConfig.endpoint = endpoint;
			clientConfig.forcePathStyle = true; // Needed for non-AWS S3 compatible services
		}
		if (bucket.region.length) {
			clientConfig.region = bucket.region;
		}
		if (!credentials.authAutoDetect) {
			clientConfig.credentials = {
				accessKeyId: credentials.accessKey,
				secretAccessKey: credentials.accessSecret,
			};
		}
		return clientConfig;
	}

	async init() {
		await this.checkConnection();
		this.setReady(true);
	}

	setReady(newState: boolean) {
		this.isReady = newState;
	}

	/**
	 * Confirm that the configured bucket exists and the caller has permission to access it.
	 */
	async checkConnection() {
		if (this.isReady) return;

		try {
			this.logger.debug('Checking connection to S3 bucket', { bucket: this.bucket });
			const command = new HeadBucketCommand({ Bucket: this.bucket });
			await this.s3Client.send(command);
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Upload an object to the configured bucket.
	 */
	async put(filename: string, buffer: Buffer, metadata: BinaryData.PreWriteMetadata = {}) {
		try {
			const params: PutObjectCommandInput = {
				Bucket: this.bucket,
				Key: filename,
				Body: buffer,
				ContentLength: buffer.length,
				ContentMD5: createHash('md5').update(buffer).digest('base64'),
			};

			if (metadata.fileName) {
				params.Metadata = { filename: encodeURIComponent(metadata.fileName) };
			}

			if (metadata.mimeType) {
				params.ContentType = metadata.mimeType;
			}

			this.logger.debug('Sending PUT request to S3', { params });
			const command = new PutObjectCommand(params);
			return await this.s3Client.send(command);
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Download an object as a stream or buffer from the configured bucket.
	 */
	async get(fileId: string, { mode }: { mode: 'buffer' }): Promise<Buffer>;
	async get(fileId: string, { mode }: { mode: 'stream' }): Promise<Readable>;
	async get(fileId: string, { mode }: { mode: 'stream' | 'buffer' }): Promise<Buffer | Readable> {
		this.logger.debug('Sending GET request to S3', { bucket: this.bucket, key: fileId });

		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: fileId,
		});

		try {
			const { Body: body } = await this.s3Client.send(command);
			if (!body) throw new UnexpectedError('Received empty response body');

			if (mode === 'stream') {
				if (body instanceof Readable) return body;
				throw new UnexpectedError(`Expected stream but received ${typeof body}.`);
			}

			return await streamToBuffer(body as Readable);
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Retrieve metadata for an object in the configured bucket.
	 */
	async getMetadata(fileId: string): Promise<MetadataResponseHeaders> {
		try {
			const command = new HeadObjectCommand({
				Bucket: this.bucket,
				Key: fileId,
			});

			this.logger.debug('Sending HEAD request to S3', { bucket: this.bucket, key: fileId });
			const response = await this.s3Client.send(command);

			// Convert response to the expected format for backward compatibility
			const headers: MetadataResponseHeaders = {};

			if (response.ContentType) headers['content-type'] = response.ContentType;
			if (response.ContentLength) headers['content-length'] = String(response.ContentLength);
			if (response.ETag) headers.etag = response.ETag;
			if (response.LastModified) headers['last-modified'] = response.LastModified.toUTCString();

			// Add metadata with the expected prefix format
			if (response.Metadata) {
				Object.entries(response.Metadata).forEach(([key, value]) => {
					headers[`x-amz-meta-${key.toLowerCase()}`] =
						key === 'filename' ? decodeURIComponent(value) : value;
				});
			}

			return headers;
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Delete a single object in the configured bucket.
	 */
	async deleteOne(fileId: string) {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: fileId,
			});

			this.logger.debug('Sending DELETE request to S3', { bucket: this.bucket, key: fileId });
			return await this.s3Client.send(command);
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Delete objects with a common prefix in the configured bucket.
	 */
	async deleteMany(prefix: string) {
		try {
			const objects = await this.list(prefix);

			if (objects.length === 0) return;

			const params: DeleteObjectsCommandInput = {
				Bucket: this.bucket,
				Delete: {
					Objects: objects.map(({ key }) => ({ Key: key })),
				},
			};

			this.logger.debug('Sending DELETE MANY request to S3', {
				bucket: this.bucket,
				objectCount: objects.length,
			});

			const command = new DeleteObjectsCommand(params);
			return await this.s3Client.send(command);
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * List objects with a common prefix in the configured bucket.
	 */
	async list(prefix: string) {
		const items = [];
		let isTruncated = true;
		let continuationToken;

		try {
			while (isTruncated) {
				const listPage = await this.getListPage(prefix, continuationToken);

				if (listPage.contents?.length > 0) {
					items.push(...listPage.contents);
				}

				isTruncated = listPage.isTruncated;
				continuationToken = listPage.nextContinuationToken;
			}

			return items;
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}

	/**
	 * Fetch a page of objects with a common prefix in the configured bucket.
	 */
	async getListPage(prefix: string, continuationToken?: string) {
		try {
			const params: ListObjectsV2CommandInput = {
				Bucket: this.bucket,
				Prefix: prefix,
			};

			if (continuationToken) {
				params.ContinuationToken = continuationToken;
			}

			this.logger.debug('Sending list request to S3', { bucket: this.bucket, prefix });
			const command = new ListObjectsV2Command(params);
			const response = await this.s3Client.send(command);

			// Convert response to match expected format for compatibility
			const contents =
				response.Contents?.map((item) => ({
					key: item.Key ?? '',
					lastModified: item.LastModified?.toISOString() ?? '',
					eTag: item.ETag ?? '',
					size: item.Size ?? 0,
					storageClass: item.StorageClass ?? '',
				})) ?? [];

			return {
				contents,
				isTruncated: response.IsTruncated ?? false,
				nextContinuationToken: response.NextContinuationToken,
			};
		} catch (e) {
			throw new UnexpectedError('Request to S3 failed', { cause: e });
		}
	}
}
