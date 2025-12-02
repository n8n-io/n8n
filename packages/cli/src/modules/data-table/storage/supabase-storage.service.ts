import { Service } from '@n8n/di';
import { SupabaseStorageConfig } from '@n8n/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { UnexpectedError } from 'n8n-workflow';
import type { FileMetadata } from 'n8n-workflow';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';

@Service()
export class SupabaseStorageService {
	private client: SupabaseClient | null = null;

	constructor(private readonly config: SupabaseStorageConfig) {}

	private getClient(): SupabaseClient {
		if (!this.config.enabled) {
			throw new UnexpectedError('Supabase storage is not enabled');
		}

		if (!this.config.url || !this.config.serviceRoleKey) {
			throw new UnexpectedError(
				'Supabase URL and Service Role Key must be configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
			);
		}

		if (!this.client) {
			this.client = createClient(this.config.url, this.config.serviceRoleKey, {
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			});
		}

		return this.client;
	}

	/**
	 * Get bucket name for a project
	 */
	private getBucketName(projectId: string): string {
		return `n8n-datatable-${projectId}`;
	}

	/**
	 * Get file path within bucket
	 */
	private getFilePath(dataTableId: string, columnId: string, fileId: string): string {
		return `${dataTableId}/${columnId}/${fileId}`;
	}

	/**
	 * Initialize bucket for a project (create if doesn't exist)
	 */
	async initBucket(projectId: string): Promise<void> {
		const client = this.getClient();
		const bucketName = this.getBucketName(projectId);

		// Check if bucket exists
		const { data: buckets, error: listError } = await client.storage.listBuckets();

		if (listError) {
			throw new UnexpectedError(`Failed to list Supabase storage buckets: ${listError.message}`);
		}

		const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

		if (!bucketExists) {
			// Create bucket with private access
			const { error: createError } = await client.storage.createBucket(bucketName, {
				public: false,
				fileSizeLimit: this.config.maxFileSize,
			});

			if (createError) {
				throw new UnexpectedError(
					`Failed to create Supabase storage bucket: ${createError.message}`,
				);
			}
		}
	}

	/**
	 * Upload file to Supabase storage
	 */
	async uploadFile(
		projectId: string,
		dataTableId: string,
		columnId: string,
		file: Buffer | Readable,
		fileName: string,
		mimeType: string,
	): Promise<FileMetadata> {
		const client = this.getClient();
		const bucketName = this.getBucketName(projectId);
		const fileId = randomUUID();
		const filePath = this.getFilePath(dataTableId, columnId, fileId);

		// Upload file
		const { error: uploadError } = await client.storage.from(bucketName).upload(filePath, file, {
			contentType: mimeType,
			upsert: false,
		});

		if (uploadError) {
			throw new UnexpectedError(
				`Failed to upload file to Supabase storage: ${uploadError.message}`,
			);
		}

		// Get public URL (even for private buckets, this returns the storage URL)
		const { data: urlData } = client.storage.from(bucketName).getPublicUrl(filePath);

		const fileSize = Buffer.isBuffer(file) ? file.length : 0;

		return {
			url: urlData.publicUrl,
			fileName,
			mimeType,
			size: fileSize,
			bucketId: bucketName,
			fileId,
			uploadedAt: new Date(),
		};
	}

	/**
	 * Download file from Supabase storage
	 */
	async downloadFile(fileMetadata: FileMetadata): Promise<Buffer> {
		const client = this.getClient();
		const filePath = this.getFilePath(
			// Extract dataTableId and columnId from the URL or pass them separately
			fileMetadata.fileId.split('/')[0] || '',
			fileMetadata.fileId.split('/')[1] || '',
			fileMetadata.fileId.split('/')[2] || fileMetadata.fileId,
		);

		const { data, error } = await client.storage.from(fileMetadata.bucketId).download(filePath);

		if (error) {
			throw new UnexpectedError(`Failed to download file from Supabase storage: ${error.message}`);
		}

		return Buffer.from(await data.arrayBuffer());
	}

	/**
	 * Delete file from Supabase storage
	 */
	async deleteFile(
		projectId: string,
		dataTableId: string,
		columnId: string,
		fileId: string,
	): Promise<void> {
		const client = this.getClient();
		const bucketName = this.getBucketName(projectId);
		const filePath = this.getFilePath(dataTableId, columnId, fileId);

		const { error } = await client.storage.from(bucketName).remove([filePath]);

		if (error) {
			throw new UnexpectedError(`Failed to delete file from Supabase storage: ${error.message}`);
		}
	}

	/**
	 * Generate signed URL for temporary file access
	 */
	async generateSignedUrl(fileMetadata: FileMetadata, expiresIn: number = 3600): Promise<string> {
		const client = this.getClient();
		const filePath = this.getFilePath(
			fileMetadata.fileId.split('/')[0] || '',
			fileMetadata.fileId.split('/')[1] || '',
			fileMetadata.fileId.split('/')[2] || fileMetadata.fileId,
		);

		const { data, error } = await client.storage
			.from(fileMetadata.bucketId)
			.createSignedUrl(filePath, expiresIn);

		if (error) {
			throw new UnexpectedError(`Failed to generate signed URL: ${error.message}`);
		}

		return data.signedUrl;
	}

	/**
	 * Delete all files for a data table column
	 */
	async deleteColumnFiles(projectId: string, dataTableId: string, columnId: string): Promise<void> {
		const client = this.getClient();
		const bucketName = this.getBucketName(projectId);
		const folderPath = `${dataTableId}/${columnId}`;

		// List all files in the column folder
		const { data: files, error: listError } = await client.storage
			.from(bucketName)
			.list(folderPath);

		if (listError) {
			throw new UnexpectedError(`Failed to list files for deletion: ${listError.message}`);
		}

		if (files && files.length > 0) {
			const filePaths = files.map((file) => `${folderPath}/${file.name}`);
			const { error: deleteError } = await client.storage.from(bucketName).remove(filePaths);

			if (deleteError) {
				throw new UnexpectedError(`Failed to delete column files: ${deleteError.message}`);
			}
		}
	}
}
