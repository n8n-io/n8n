'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BinaryDataService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const crypto_1 = require('crypto');
const path_1 = require('path');
let BinaryDataService = class BinaryDataService {
	constructor(coreBinaryDataService, logger) {
		this.coreBinaryDataService = coreBinaryDataService;
		this.logger = logger;
	}
	async uploadBinaryData(data, options = {}) {
		const {
			fileName = 'untitled',
			mimeType = 'application/octet-stream',
			workflowId = 'upload',
			executionId = Date.now().toString(),
		} = options;
		try {
			this.validateFileUpload(fileName, mimeType, data);
			const binaryData = {
				fileName,
				mimeType,
				fileExtension: this.getFileExtension(fileName),
				data: '',
			};
			const storedBinaryData = await this.coreBinaryDataService.store(
				workflowId,
				executionId,
				data instanceof Buffer ? data : data,
				binaryData,
			);
			const buffer = data instanceof Buffer ? data : await this.streamToBuffer(data);
			const checksum = this.calculateChecksum(buffer);
			const metadata = {
				id: storedBinaryData.id,
				fileName: storedBinaryData.fileName,
				mimeType: storedBinaryData.mimeType,
				fileSize: this.parseFileSize(storedBinaryData.fileSize),
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Failed to upload binary data', { cause: error });
		}
	}
	async getBinaryDataStream(binaryDataId, chunkSize) {
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
	async getBinaryDataMetadata(binaryDataId) {
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
	async deleteBinaryData(binaryDataId, workflowId = 'upload', executionId = 'manual') {
		try {
			this.validateBinaryDataId(binaryDataId);
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
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new n8n_workflow_1.ApplicationError('Failed to delete binary data', { cause: error });
		}
	}
	createSignedToken(binaryDataId, expiresIn = '1 day') {
		try {
			const binaryData = {
				id: binaryDataId,
				data: '',
				mimeType: 'application/octet-stream',
			};
			return this.coreBinaryDataService.createSignedToken(binaryData, expiresIn);
		} catch (error) {
			this.logger.error('Failed to create signed token', {
				binaryDataId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	validateSignedToken(token) {
		try {
			return this.coreBinaryDataService.validateSignedToken(token);
		} catch (error) {
			this.logger.error('Failed to validate signed token', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	validateBinaryDataId(binaryDataId) {
		if (!binaryDataId) {
			throw new n8n_workflow_1.ApplicationError('Missing binary data ID');
		}
		if (!binaryDataId.includes(':')) {
			throw new n8n_workflow_1.ApplicationError('Invalid binary data ID format');
		}
		const [mode, fileId] = binaryDataId.split(':');
		if (!mode || !fileId) {
			throw new n8n_workflow_1.ApplicationError('Malformed binary data ID');
		}
		const validModes = ['filesystem', 'filesystem-v2', 's3', 'default'];
		if (!validModes.includes(mode)) {
			throw new n8n_workflow_1.ApplicationError(`Invalid binary data mode: ${mode}`);
		}
	}
	validateFileUpload(fileName, mimeType, data) {
		if (fileName && (fileName.includes('..') || fileName.includes('/'))) {
			throw new n8n_workflow_1.ApplicationError('Invalid file name - path traversal detected');
		}
		const dangerousMimeTypes = [
			'application/x-executable',
			'application/x-msdownload',
			'application/x-msdos-program',
			'text/x-script',
		];
		if (dangerousMimeTypes.includes(mimeType.toLowerCase())) {
			throw new n8n_workflow_1.ApplicationError(`File type not allowed: ${mimeType}`);
		}
		if (data instanceof Buffer) {
			const maxSize = 100 * 1024 * 1024;
			if (data.length > maxSize) {
				throw new n8n_workflow_1.ApplicationError(
					`File too large: ${data.length} bytes (max: ${maxSize} bytes)`,
				);
			}
		}
	}
	getFileExtension(fileName) {
		const ext = (0, path_1.extname)(fileName);
		return ext.startsWith('.') ? ext.substring(1) : ext;
	}
	calculateChecksum(buffer) {
		return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
	}
	parseFileSize(fileSize) {
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
	async streamToBuffer(stream) {
		const chunks = [];
		return new Promise((resolve, reject) => {
			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	}
};
exports.BinaryDataService = BinaryDataService;
exports.BinaryDataService = BinaryDataService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [n8n_core_1.BinaryDataService, backend_common_1.Logger]),
	],
	BinaryDataService,
);
//# sourceMappingURL=binary-data.service.js.map
