import { binaryToBuffer, binaryToString } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import chardet from 'chardet';
import { IncomingMessage } from 'http';
import get from 'lodash/get';
import { extension, lookup } from 'mime-types';
import type { StringValue as TimeUnitValue } from 'ms';
import type {
	BinaryHelperFunctions,
	IBinaryData,
	INode,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	WorkflowSettingsBinaryMode,
} from 'n8n-workflow';
import {
	NodeOperationError,
	fileTypeFromMimeType,
	isBinaryValue,
	BINARY_MODE_COMBINED,
	BINARY_MODE_SEPARATE,
	sanitizeFilename,
} from 'n8n-workflow';
import { UserError, UnexpectedError } from '@n8n/errors';
import path from 'path';
import type { Readable } from 'stream';
import { URL } from 'url';

import { BinaryDataService } from '@/binary-data/binary-data.service';
import type { BinaryData } from '@/binary-data/types';

const BINARY_ACCESS_ERROR = 'This binary data is not available to the current workflow.';

function isExplicitlyGranted(binaryDataId: string, runExecutionData?: IRunExecutionData | null) {
	return runExecutionData?.binaryDataAccess?.includes(binaryDataId) === true;
}

function grantBinaryData(
	binaryData: IBinaryData,
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData?: IRunExecutionData | null,
) {
	if (!binaryData.id) return;
	if (!additionalData.binaryDataAccess) return;
	additionalData.binaryDataAccess.grant(binaryData.id);
	if (!runExecutionData || isExplicitlyGranted(binaryData.id, runExecutionData)) return;

	runExecutionData.binaryDataAccess = [...(runExecutionData.binaryDataAccess ?? []), binaryData.id];
}

async function assertBinaryDataAccess(
	binaryDataId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
) {
	if (!additionalData.binaryDataAccess) return;
	if (
		!(await additionalData.binaryDataAccess.isAllowed(
			binaryDataId,
			workflowId,
			runExecutionData?.binaryDataAccess,
		))
	) {
		throw new UserError(BINARY_ACCESS_ERROR);
	}
}

async function getBinaryPath(
	binaryDataId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
): Promise<string> {
	await assertBinaryDataAccess(binaryDataId, additionalData, workflowId, runExecutionData);
	return Container.get(BinaryDataService).getPath(binaryDataId);
}

/**
 * Returns binary file metadata
 */
async function getBinaryMetadata(
	binaryDataId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
): Promise<BinaryData.Metadata> {
	await assertBinaryDataAccess(binaryDataId, additionalData, workflowId, runExecutionData);
	return await Container.get(BinaryDataService).getMetadata(binaryDataId);
}

/**
 * Returns binary file stream for piping
 */
async function getBinaryStream(
	binaryDataId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
	chunkSize?: number,
): Promise<Readable> {
	await assertBinaryDataAccess(binaryDataId, additionalData, workflowId, runExecutionData);
	return await Container.get(BinaryDataService).getAsStream(binaryDataId, chunkSize);
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
	binaryMode: WorkflowSettingsBinaryMode = BINARY_MODE_SEPARATE,
): IBinaryData {
	if (isBinaryValue(parameterData)) {
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

	if (binaryMode === BINARY_MODE_COMBINED) {
		const itemData = inputData.main[inputIndex]![itemIndex].json;
		const binaryData = get(itemData, parameterData);
		if (!isBinaryValue(binaryData)) {
			throw new NodeOperationError(
				node,
				`The path '${parameterData}' does not resolve to a binary data object in the input data [item ${itemIndex}]`,
				{
					itemIndex,
					description: `Check that the path '${parameterData}' is correct, and that it resolves to a binary data object in the input data`,
				},
			);
		}
		return binaryData;
	} else {
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
	binaryMode: WorkflowSettingsBinaryMode = BINARY_MODE_SEPARATE,
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
): Promise<Buffer> {
	let binaryData: IBinaryData;

	if (isBinaryValue(parameterData)) {
		binaryData = parameterData;
	} else if (typeof parameterData === 'string' && binaryMode !== BINARY_MODE_COMBINED) {
		binaryData = inputData.main[inputIndex]![itemIndex].binary![parameterData];
	} else if (typeof parameterData === 'string') {
		const itemData = inputData.main[inputIndex]![itemIndex].json;
		const data = get(itemData, parameterData);
		if (!isBinaryValue(data)) {
			throw new UnexpectedError('Provided parameter is not a string or binary data object.');
		}
		binaryData = data;
	} else {
		throw new UnexpectedError('Provided parameter is not a string or binary data object.');
	}

	if (binaryData.id) {
		await assertBinaryDataAccess(binaryData.id, additionalData, workflowId, runExecutionData);
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
		{ type: 'execution', workflowId, executionId },
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
			const { fileTypeFromFile } = await import('file-type');
			const fileTypeData = await fileTypeFromFile(filePath);
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
		returnData.fileName = sanitizeFilename(fileName);
	} else if (filePath) {
		returnData.fileName = sanitizeFilename(filePath);
	}

	return await Container.get(BinaryDataService).copyBinaryFile(
		{ type: 'execution', workflowId, executionId },
		returnData,
		filePath,
	);
}

export const getNodeBinaryHelperFunctions = (
	workflow: { id: string },
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData?: IRunExecutionData | null,
) => ({
	copyBinaryFile: async (filePath: string, fileName: string, mimeType?: string) => {
		const stored = await copyBinaryFile(
			workflow.id,
			additionalData.executionId!,
			filePath,
			fileName,
			mimeType,
		);
		grantBinaryData(stored, additionalData, runExecutionData);
		return stored;
	},
});

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
	let fullUrl: string | undefined;
	if (binaryData instanceof IncomingMessage) {
		if (!filePath) {
			try {
				const { responseUrl } = binaryData;
				let sanitizedUrl: string | undefined;
				let urlPathname: string | undefined;
				if (responseUrl) {
					const parsed = new URL(responseUrl);
					parsed.username = '';
					parsed.password = '';
					parsed.search = '';
					parsed.hash = '';
					sanitizedUrl = parsed.toString();
					urlPathname = parsed.pathname;
				}
				const requestPathname = binaryData.req?.path
					? new URL(binaryData.req.path, 'http://localhost').pathname
					: undefined;
				filePath =
					binaryData.contentDisposition?.filename ?? (urlPathname ?? requestPathname)?.slice(1);
				fullUrl = sanitizedUrl;
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
				const { fileTypeFromBuffer } = await import('file-type');
				const fileTypeData = await fileTypeFromBuffer(binaryData);
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

		if (fullUrl) {
			returnData.directory = fullUrl;
		} else if (filePathParts.dir !== '') {
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
	additionalData: IWorkflowExecuteAdditionalData,
	workflowId: string,
	runExecutionData?: IRunExecutionData | null,
): BinaryHelperFunctions => {
	const { executionId, restApiUrl } = additionalData;

	return {
		getBinaryPath: async (binaryDataId) =>
			await getBinaryPath(binaryDataId, additionalData, workflowId, runExecutionData),
		getBinaryStream: async (binaryDataId, chunkSize) =>
			await getBinaryStream(binaryDataId, additionalData, workflowId, runExecutionData, chunkSize),
		getBinaryMetadata: async (binaryDataId) =>
			await getBinaryMetadata(binaryDataId, additionalData, workflowId, runExecutionData),
		binaryToBuffer,
		binaryToString,
		createBinarySignedUrl(binaryData: IBinaryData, expiresIn?: TimeUnitValue) {
			if (!binaryData.id) throw new UserError('URL signing is not available in memory mode');
			const granted =
				isExplicitlyGranted(binaryData.id, runExecutionData) ||
				additionalData.binaryDataAccess?.isGranted(binaryData.id) !== false;
			const token = Container.get(BinaryDataService).createSignedToken(
				binaryData,
				expiresIn,
				granted ? undefined : workflowId,
			);
			return `${restApiUrl}/binary-data/signed?token=${token}`;
		},
		prepareBinaryData: async (binaryData, filePath, mimeType) => {
			const prepared = await prepareBinaryData(
				binaryData,
				executionId!,
				workflowId,
				filePath,
				mimeType,
			);
			grantBinaryData(prepared, additionalData, runExecutionData);
			return prepared;
		},
		setBinaryDataBuffer: async (data, binaryData) => {
			const stored = await setBinaryDataBuffer(data, binaryData, workflowId, executionId!);
			grantBinaryData(stored, additionalData, runExecutionData);
			return stored;
		},
		// oxlint-disable-next-line typescript/no-deprecated -- Keep the upgrade error for nodes that call the removed helper.
		copyBinaryFile: async () => {
			throw new UserError('`copyBinaryFile` has been removed. Please upgrade this node.');
		},
	};
};
