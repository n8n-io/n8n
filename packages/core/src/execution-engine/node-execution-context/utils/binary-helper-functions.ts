import { Container } from '@n8n/di';
import chardet from 'chardet';
import FileType from 'file-type';
import { IncomingMessage } from 'http';
import iconv from 'iconv-lite';
import { extension, lookup } from 'mime-types';
import type { StringValue as TimeUnitValue } from 'ms';
import type {
	BinaryHelperFunctions,
	IBinaryData,
	INode,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	NodeOperationError,
	fileTypeFromMimeType,
	ApplicationError,
	UnexpectedError,
} from 'n8n-workflow';
import path from 'path';
import type { Readable } from 'stream';
import { URL } from 'url';

import { BinaryDataService } from '@/binary-data/binary-data.service';
import type { BinaryData } from '@/binary-data/types';
import { binaryToBuffer } from '@/binary-data/utils';

import { parseIncomingMessage } from './parse-incoming-message';

export async function binaryToString(body: Buffer | Readable, encoding?: string) {
	if (!encoding && body instanceof IncomingMessage) {
		parseIncomingMessage(body);
		encoding = body.encoding;
	}
	const buffer = await binaryToBuffer(body);
	return iconv.decode(buffer, encoding ?? 'utf-8');
}

function getBinaryPath(binaryDataId: string): string {
	return Container.get(BinaryDataService).getPath(binaryDataId);
}

/**
 * Returns binary file metadata
 */
async function getBinaryMetadata(binaryDataId: string): Promise<BinaryData.Metadata> {
	return await Container.get(BinaryDataService).getMetadata(binaryDataId);
}

/**
 * Returns binary file stream for piping
 */
async function getBinaryStream(binaryDataId: string, chunkSize?: number): Promise<Readable> {
	return await Container.get(BinaryDataService).getAsStream(binaryDataId, chunkSize);
}

/**
 * Check if object is a binary data
 */
function isBinaryData(obj: unknown): obj is IBinaryData {
	return typeof obj === 'object' && obj !== null && 'data' in obj && 'mimeType' in obj;
}

/**
 * If parameterData is a string, returns the binary data the given item index and
 * property name from the input data.
 * Else if parameterData is a binary data object, returns the binary data object.
 */
export function assertBinaryData(
	inputData: ITaskDataConnections,
	node: INode,
	itemIndex: number,
	parameterData: string | IBinaryData,
	inputIndex: number,
): IBinaryData {
	if (isBinaryData(parameterData)) {
		return parameterData;
	}
	if (typeof parameterData !== 'string') {
		throw new NodeOperationError(
			node,
			'Provided parameter is not a string or binary data object.',
			{
				itemIndex,
				description:
					'Specify the property name of the binary data in input item or use an expression to access the binary data in previous nodes, e.g. "{{ $(_target_node_).item.binary[_binary_property_name_] }}"',
			},
		);
	}
	const binaryKeyData = inputData.main[inputIndex]![itemIndex].binary;
	if (binaryKeyData === undefined) {
		throw new NodeOperationError(
			node,
			`This operation expects the node's input data to contain a binary file '${parameterData}', but none was found [item ${itemIndex}]`,
			{
				itemIndex,
				description: 'Make sure that the previous node outputs a binary file',
			},
		);
	}

	const binaryPropertyData = binaryKeyData[parameterData];
	if (binaryPropertyData === undefined) {
		throw new NodeOperationError(
			node,
			`The item has no binary field '${parameterData}' [item ${itemIndex}]`,
			{
				itemIndex,
				description:
					'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input',
			},
		);
	}

	return binaryPropertyData;
}

/**
 * If parameterData is a string, returns the binary data buffer for the given item index and
 * property name from the input data.
 * Else returns the binary data buffer for the given binary data object.
 */
export async function getBinaryDataBuffer(
	inputData: ITaskDataConnections,
	itemIndex: number,
	parameterData: string | IBinaryData,
	inputIndex: number,
): Promise<Buffer> {
	let binaryData: IBinaryData;

	if (isBinaryData(parameterData)) {
		binaryData = parameterData;
	} else if (typeof parameterData === 'string') {
		binaryData = inputData.main[inputIndex]![itemIndex].binary![parameterData];
	} else {
		throw new UnexpectedError('Provided parameter is not a string or binary data object.');
	}

	return await Container.get(BinaryDataService).getAsBuffer(binaryData);
}

export function detectBinaryEncoding(buffer: Buffer): string {
	return chardet.detect(buffer) as string;
}

/**
 * Store an incoming IBinaryData & related buffer using the configured binary data manager.
 *
 * @export
 * @param {IBinaryData} binaryData
 * @param {Buffer | Readable} bufferOrStream
 * @returns {Promise<IBinaryData>}
 */
export async function setBinaryDataBuffer(
	binaryData: IBinaryData,
	bufferOrStream: Buffer | Readable,
	workflowId: string,
	executionId: string,
): Promise<IBinaryData> {
	return await Container.get(BinaryDataService).store(
		workflowId,
		executionId,
		bufferOrStream,
		binaryData,
	);
}

export async function copyBinaryFile(
	workflowId: string,
	executionId: string,
	filePath: string,
	fileName: string,
	mimeType?: string,
): Promise<IBinaryData> {
	let fileExtension: string | undefined;
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
			// read the first bytes of the file to guess mime type
			const fileTypeData = await FileType.fromFile(filePath);
			if (fileTypeData) {
				mimeType = fileTypeData.mime;
				fileExtension = fileTypeData.ext;
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

	if (fileName) {
		returnData.fileName = fileName;
	} else if (filePath) {
		returnData.fileName = path.parse(filePath).base;
	}

	return await Container.get(BinaryDataService).copyBinaryFile(
		workflowId,
		executionId,
		returnData,
		filePath,
	);
}

/**
 * Takes a buffer and converts it into the format n8n uses. It encodes the binary data as
 * base64 and adds metadata.
 */

export async function prepareBinaryData(
	binaryData: Buffer | Readable,
	executionId: string,
	workflowId: string,
	filePath?: string,
	mimeType?: string,
): Promise<IBinaryData> {
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
		const filePathParts = path.parse(filePath);

		if (filePathParts.dir !== '') {
			returnData.directory = filePathParts.dir;
		}
		returnData.fileName = filePathParts.base;

		// Remove the dot
		fileExtension = filePathParts.ext.slice(1);
		if (fileExtension) {
			returnData.fileExtension = fileExtension;
		}
	}

	return await setBinaryDataBuffer(returnData, binaryData, workflowId, executionId);
}

export const getBinaryHelperFunctions = (
	{ executionId, restApiUrl }: IWorkflowExecuteAdditionalData,
	workflowId: string,
): BinaryHelperFunctions => ({
	getBinaryPath,
	getBinaryStream,
	getBinaryMetadata,
	binaryToBuffer,
	binaryToString,
	createBinarySignedUrl(binaryData: IBinaryData, expiresIn?: TimeUnitValue) {
		const token = Container.get(BinaryDataService).createSignedToken(binaryData, expiresIn);
		return `${restApiUrl}/binary-data/signed?token=${token}`;
	},
	prepareBinaryData: async (binaryData, filePath, mimeType) =>
		await prepareBinaryData(binaryData, executionId!, workflowId, filePath, mimeType),
	setBinaryDataBuffer: async (data, binaryData) =>
		await setBinaryDataBuffer(data, binaryData, workflowId, executionId!),
	copyBinaryFile: async () => {
		throw new ApplicationError('`copyBinaryFile` has been removed. Please upgrade this node.');
	},
});
