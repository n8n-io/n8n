import Container from 'typedi';
import FileType from 'file-type';
import { IncomingMessage } from 'http';
import path from 'path';
import { extension, lookup } from 'mime-types';
import { Readable } from 'stream';
import { ApplicationError, fileTypeFromMimeType, IBinaryData } from 'n8n-workflow';
import type { BinaryHelperFunctions, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';

import { binaryToBuffer } from '@/BinaryData/utils';
import { BinaryDataService } from '@/BinaryData/BinaryData.service';
import { binaryToString } from '@/NodeExecuteFunctions';

export class BinaryHelpers implements BinaryHelperFunctions {
	private readonly binaryDataService = Container.get(BinaryDataService);

	constructor(
		private readonly workflow: Workflow,
		private readonly additionalData: IWorkflowExecuteAdditionalData,
	) {}

	getBinaryPath(binaryDataId: string) {
		return this.binaryDataService.getPath(binaryDataId);
	}

	async getBinaryMetadata(binaryDataId: string) {
		return await this.binaryDataService.getMetadata(binaryDataId);
	}

	async getBinaryStream(binaryDataId: string, chunkSize?: number) {
		return await this.binaryDataService.getAsStream(binaryDataId, chunkSize);
	}

	get binaryToBuffer() {
		return binaryToBuffer;
	}

	get binaryToString() {
		return binaryToString;
	}

	async prepareBinaryData(binaryData: Buffer | Readable, filePath?: string, mimeType?: string) {
		let fileExtension: string | undefined;
		if (binaryData instanceof IncomingMessage) {
			if (!filePath) {
				try {
					const { responseUrl } = binaryData;
					filePath =
						binaryData.contentDisposition?.filename ??
						((responseUrl && new URL(responseUrl).pathname) ?? binaryData.req?.path)?.slice(1);
				} catch {}
			}
			if (!mimeType) {
				mimeType = binaryData.contentType;
			}
		}

		if (!mimeType) {
			// If no mime type is given figure it out

			if (filePath) {
				// Use file path to guess mime type
				const mimeTypeLookup = lookup(filePath);
				if (mimeTypeLookup) {
					mimeType = mimeTypeLookup;
				}
			}

			if (!mimeType) {
				if (Buffer.isBuffer(binaryData)) {
					// Use buffer to guess mime type
					const fileTypeData = await FileType.fromBuffer(binaryData);
					if (fileTypeData) {
						mimeType = fileTypeData.mime;
						fileExtension = fileTypeData.ext;
					}
				} else if (binaryData instanceof IncomingMessage) {
					mimeType = binaryData.headers['content-type'];
				} else {
					// TODO: detect filetype from other kind of streams
				}
			}
		}

		if (!fileExtension && mimeType) {
			fileExtension = extension(mimeType) || undefined;
		}

		if (!mimeType) {
			// Fall back to text
			mimeType = 'text/plain';
		}

		const returnData: IBinaryData = {
			mimeType,
			fileType: fileTypeFromMimeType(mimeType),
			fileExtension,
			data: '',
		};

		if (filePath) {
			if (filePath.includes('?')) {
				// Remove maybe present query parameters
				filePath = filePath.split('?').shift();
			}

			const filePathParts = path.parse(filePath as string);

			if (filePathParts.dir !== '') {
				returnData.directory = filePathParts.dir;
			}
			returnData.fileName = filePathParts.base;

			// Remove the dot
			const fileExtension = filePathParts.ext.slice(1);
			if (fileExtension) {
				returnData.fileExtension = fileExtension;
			}
		}

		return await this.setBinaryDataBuffer(returnData, binaryData);
	}

	async setBinaryDataBuffer(binaryData: IBinaryData, bufferOrStream: Buffer | Readable) {
		return await this.binaryDataService.store(
			this.workflow.id,
			this.additionalData.executionId!,
			bufferOrStream,
			binaryData,
		);
	}

	async copyBinaryFile(): Promise<never> {
		throw new ApplicationError('`copyBinaryFile` has been removed. Please upgrade this node.');
	}
}
