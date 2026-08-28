import { binaryToBuffer } from '@n8n/backend-network';
import type { IBinaryData } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import { readFile, stat } from 'node:fs/promises';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';

import { mock } from './mock-extended';
import type { BinaryData } from '../dist/binary-data';
import { BinaryDataService } from '../dist/binary-data';

/**
 * Keeps binary data inline (base64 in `data`, no id) instead of writing it to
 * a store, so workflow test fixtures can assert binary payloads without disk
 * IO or a per-test storage path.
 */
export class InlineBinaryDataService extends BinaryDataService {
	constructor() {
		super(mock(), mock(), mock());
	}

	override async store(
		_location: BinaryData.FileLocation,
		bufferOrStream: Buffer | Readable,
		binaryData: IBinaryData,
	) {
		const buffer = await binaryToBuffer(bufferOrStream);
		binaryData.data = buffer.toString(BINARY_ENCODING);
		binaryData.fileSize = prettyBytes(buffer.length);
		binaryData.bytes = buffer.length;

		return binaryData;
	}

	override async copyBinaryFile(
		_location: BinaryData.FileLocation,
		binaryData: IBinaryData,
		filePath: string,
	) {
		const { size } = await stat(filePath);
		binaryData.fileSize = prettyBytes(size);
		binaryData.bytes = size;
		binaryData.data = await readFile(filePath, { encoding: BINARY_ENCODING });

		return binaryData;
	}
}
