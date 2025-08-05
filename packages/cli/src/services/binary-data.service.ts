import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BinaryDataService as CoreBinaryDataService } from 'n8n-core';
import type { IBinaryData, IDataObject } from 'n8n-workflow';
import { ApplicationError, BINARY_ENCODING } from 'n8n-workflow';
import { createHash } from 'crypto';
import { extname } from 'path';
import type { Readable } from 'stream';

interface BinaryDataUploadOptions {
	fileName?: string;
	mimeType?: string;
	workflowId?: string;
	executionId?: string;
}

interface BinaryDataMetadata {
	id: string;
	fileName?: string;
	mimeType?: string;
	fileSize: number;
	checksum: string;
	uploadedAt: Date;
}

@Service()
export class BinaryDataService {
	constructor(
		private readonly coreBinaryDataService: CoreBinaryDataService,
		private readonly logger: Logger,
	) {}

	/**
	 * Upload binary data from buffer or stream
	 */
	async uploadBinaryData(
		data: Buffer | Readable,
		options: BinaryDataUploadOptions = {},
	): Promise<BinaryDataMetadata> {
		const {
			fileName = 'untitled',
			mimeType = 'application/octet-stream',
			workflowId = 'upload',
			executionId = Date.now().toString(),
		} = options;

		try {
			// Validate file type and size
			this.validateFileUpload(fileName, mimeType, data);

			// Create IBinaryData object
			const binaryData: IBinaryData = {
				fileName,
				mimeType,
				fileExtension: this.getFileExtension(fileName),
				data: '', // Will be populated by the core service
			};

			// Store the binary data using core service
			const storedBinaryData = await this.coreBinaryDataService.store(
				workflowId,
				executionId,
				data instanceof Buffer ? data : data,
				binaryData,
			);

			// Calculate checksum for integrity validation
			const buffer = data instanceof Buffer ? data : await this.streamToBuffer(data as Readable);
			const checksum = this.calculateChecksum(buffer);

			const metadata: BinaryDataMetadata = {
				id: storedBinaryData.id!,
				fileName: storedBinaryData.fileName,
				mimeType: storedBinaryData.mimeType,
				fileSize: this.parseFileSize(storedBinaryData.fileSize!),
				checksum,
				uploadedAt: new Date(),
			};

			this.logger.info('Binary data uploaded successfully', {
				id: metadata.id,
				fileName: metadata.fileName,
				fileSize: metadata.fileSize,
			});

			return metadata;
		} catch (error) {
			this.logger.error('Failed to upload binary data', {
				fileName,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Failed to upload binary data', { cause: error });
		}
	}

	/**
	 * Get binary data as stream
	 */
	async getBinaryDataStream(binaryDataId: string, chunkSize?: number): Promise<Readable> {
		try {
			this.validateBinaryDataId(binaryDataId);
			return await this.coreBinaryDataService.getAsStream(binaryDataId, chunkSize);
		} catch (error) {
			this.logger.error('Failed to get binary data stream', {
				binaryDataId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * Get binary data metadata
	 */
	async getBinaryDataMetadata(binaryDataId: string): Promise<IDataObject> {
		try {
			this.validateBinaryDataId(binaryDataId);
			const metadata = await this.coreBinaryDataService.getMetadata(binaryDataId);

			return {
				id: binaryDataId,
				...metadata,
				retrievedAt: new Date(),
			};
		} catch (error) {
			this.logger.error('Failed to get binary data metadata', {
				binaryDataId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * Delete binary data
	 */
	async deleteBinaryData(
		binaryDataId: string,
		workflowId = 'upload',
		executionId = 'manual',
	): Promise<void> {
		try {
			this.validateBinaryDataId(binaryDataId);

			// Use deleteMany with the expected format
			await this.coreBinaryDataService.deleteMany([
				{
					workflowId,
					executionId,
				},
			]);

			this.logger.info('Binary data deleted successfully', { binaryDataId });
		} catch (error) {
			this.logger.error('Failed to delete binary data', {
				binaryDataId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new ApplicationError('Failed to delete binary data', { cause: error });
		}
	}

	/**
	 * Create signed token for secure access
	 */
	createSignedToken(binaryDataId: string, expiresIn = '1 day'): string {
		try {
			// Create temporary IBinaryData object for token generation
			const binaryData: IBinaryData = {
				id: binaryDataId,
				data: '',
				mimeType: 'application/octet-stream',
			};
			return this.coreBinaryDataService.createSignedToken(binaryData, expiresIn as any);
		} catch (error) {
			this.logger.error('Failed to create signed token', {
				binaryDataId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	/**
	 * Validate signed token and return binary data ID
	 */
	validateSignedToken(token: string): string {
		try {
			return this.coreBinaryDataService.validateSignedToken(token);
		} catch (error) {
			this.logger.error('Failed to validate signed token', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	// ----------------------------------
	//         Private Methods
	// ----------------------------------

	private validateBinaryDataId(binaryDataId: string): void {
		if (!binaryDataId) {
			throw new ApplicationError('Missing binary data ID');
		}

		if (!binaryDataId.includes(':')) {
			throw new ApplicationError('Invalid binary data ID format');
		}

		const [mode, fileId] = binaryDataId.split(':');
		if (!mode || !fileId) {
			throw new ApplicationError('Malformed binary data ID');
		}

		// Validate mode
		const validModes = ['filesystem', 'filesystem-v2', 's3', 'default'];
		if (!validModes.includes(mode)) {
			throw new ApplicationError(`Invalid binary data mode: ${mode}`);
		}
	}

	private validateFileUpload(fileName: string, mimeType: string, data: Buffer | Readable): void {
		// File name validation
		if (fileName && (fileName.includes('..') || fileName.includes('/'))) {
			throw new ApplicationError('Invalid file name - path traversal detected');
		}

		// MIME type validation - basic security check
		const dangerousMimeTypes = [
			'application/x-executable',
			'application/x-msdownload',
			'application/x-msdos-program',
			'text/x-script',
		];

		if (dangerousMimeTypes.includes(mimeType.toLowerCase())) {
			throw new ApplicationError(`File type not allowed: ${mimeType}`);
		}

		// Size validation for Buffer (stream size will be checked during processing)
		if (data instanceof Buffer) {
			const maxSize = 100 * 1024 * 1024; // 100MB limit
			if (data.length > maxSize) {
				throw new ApplicationError(`File too large: ${data.length} bytes (max: ${maxSize} bytes)`);
			}
		}
	}

	private getFileExtension(fileName: string): string {
		const ext = extname(fileName);
		return ext.startsWith('.') ? ext.substring(1) : ext;
	}

	private calculateChecksum(buffer: Buffer): string {
		return createHash('sha256').update(buffer).digest('hex');
	}

	private parseFileSize(fileSize: string): number {
		// Parse human-readable file size (e.g., "1.5 MB") to bytes
		const match = fileSize.match(/^([\d.]+)\s*([KMGT]?B)$/i);
		if (!match) return 0;

		const [, size, unit] = match;
		const bytes = parseFloat(size);

		switch (unit.toUpperCase()) {
			case 'KB':
				return Math.round(bytes * 1024);
			case 'MB':
				return Math.round(bytes * 1024 * 1024);
			case 'GB':
				return Math.round(bytes * 1024 * 1024 * 1024);
			case 'TB':
				return Math.round(bytes * 1024 * 1024 * 1024 * 1024);
			default:
				return Math.round(bytes);
		}
	}

	private async streamToBuffer(stream: Readable): Promise<Buffer> {
		const chunks: Buffer[] = [];

		return new Promise((resolve, reject) => {
			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	}
}
