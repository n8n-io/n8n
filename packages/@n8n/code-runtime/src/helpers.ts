import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';

import { errorFromRpc } from './errors';
import { UNSUPPORTED_HELPER_FUNCTIONS } from './vendor/unsupported-helpers';
import type { OutputBinaryInfo, RpcCaller, StagedBinary } from './types';
import { SANDBOX_OUT_PREFIX } from './types';

type SerializedBuffer = { type: 'Buffer'; data: number[] };

function isSerializedBuffer(v: unknown): v is SerializedBuffer {
	return (
		typeof v === 'object' &&
		v !== null &&
		(v as SerializedBuffer).type === 'Buffer' &&
		Array.isArray((v as SerializedBuffer).data)
	);
}

export class UnsupportedFunctionError extends Error {
	constructor(functionName: string) {
		super(`The function "${functionName}" is not supported in the Code Node`);
	}
}

const MIME_BY_EXTENSION: Record<string, string> = {
	json: 'application/json',
	txt: 'text/plain',
	csv: 'text/csv',
	html: 'text/html',
	xml: 'application/xml',
	pdf: 'application/pdf',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	zip: 'application/zip',
};

function prettyBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	const units = ['kB', 'MB', 'GB', 'TB'];
	let v = n;
	let i = -1;
	do {
		v /= 1024;
		i++;
	} while (v >= 1024 && i < units.length - 1);
	return `${Math.round(v * 10) / 10} ${units[i]}`;
}

export interface HelperState {
	binaryReads: number;
	rpcCount: number;
	outputBinaries: Record<string, OutputBinaryInfo>;
}

export interface HelperOptions {
	dir: string;
	rpc: RpcCaller;
	binaries: StagedBinary[];
	inputItems: () => Array<INodeExecutionData | undefined>;
	state: HelperState;
}

/**
 * Builds the `helpers` object of the Code node.
 *
 * - `httpRequest` and `request` run in n8n through the RPC channel, so n8n
 *   applies its SSRF protection and proxy settings.
 * - Binary helpers read the input files that n8n staged in `in/` and write
 *   output files to `out/bin/`. n8n stores the output files after the task.
 */
export function buildHelpers(opts: HelperOptions): Record<string, unknown> {
	const { dir, rpc, binaries, state } = opts;
	const inDir = path.join(dir, 'in');
	const outBinDir = path.join(dir, 'out', 'bin');

	const helpers: Record<string, unknown> = {};
	for (const name of UNSUPPORTED_HELPER_FUNCTIONS) {
		const short = name.replace(/^helpers\./, '');
		helpers[short] = () => {
			throw new UnsupportedFunctionError(name);
		};
	}

	const callRpc = async (name: string, params: unknown[]) => {
		state.rpcCount++;
		try {
			const result = await rpc(name, params);
			return isSerializedBuffer(result) ? Buffer.from(result.data) : result;
		} catch (e) {
			throw e instanceof Error ? e : errorFromRpc(e);
		}
	};

	const getItemBinary = (itemIndex: number, propertyName: string | IBinaryData): IBinaryData => {
		if (typeof propertyName === 'object' && propertyName !== null) return propertyName;
		const item = opts.inputItems()[itemIndex];
		const bin = item?.binary?.[propertyName];
		if (!bin) {
			throw new Error(`No binary data property "${propertyName}" exists on item!`);
		}
		return bin;
	};

	const stagedFile = (bin: IBinaryData, itemIndex?: number, property?: string) => {
		const entry = binaries.find(
			(b) =>
				(bin.id !== undefined && b.id === bin.id) ||
				(itemIndex !== undefined && b.itemIndex === itemIndex && b.property === property),
		);
		return entry ? path.join(inDir, entry.path) : undefined;
	};

	const toBuffer = async (body: Buffer | Readable): Promise<Buffer> => {
		if (Buffer.isBuffer(body)) return body;
		const chunks: Buffer[] = [];
		for await (const c of body) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c as string));
		return Buffer.concat(chunks);
	};

	const writeOutput = async (
		content: Buffer | Readable | Uint8Array | string,
		info: OutputBinaryInfo,
	): Promise<{ uuid: string; size: number }> => {
		const uuid = randomUUID();
		const file = path.join(outBinDir, uuid);
		if (content instanceof Readable) {
			await pipeline(content, createWriteStream(file));
		} else {
			await writeFile(file, content);
		}
		const { size } = await stat(file);
		state.outputBinaries[uuid] = info;
		return { uuid, size };
	};

	Object.assign(helpers, {
		httpRequest: async (...params: unknown[]) => await callRpc('helpers.httpRequest', params),
		request: async (...params: unknown[]) => await callRpc('helpers.request', params),

		assertBinaryData: (itemIndex: number, propertyName: string) =>
			getItemBinary(itemIndex, propertyName),

		getBinaryDataBuffer: async (itemIndex: number, propertyName: string | IBinaryData) => {
			const bin = getItemBinary(itemIndex, propertyName);
			if (!bin.id && bin.data) return Buffer.from(bin.data, 'base64');
			const file = stagedFile(
				bin,
				itemIndex,
				typeof propertyName === 'string' ? propertyName : undefined,
			);
			if (file) {
				state.binaryReads++;
				return await readFile(file);
			}
			throw new Error(
				`The binary data of property "${typeof propertyName === 'string' ? propertyName : (propertyName.fileName ?? '')}" was not sent to the sandbox`,
			);
		},

		getBinaryStream: async (binaryDataId: string, chunkSize?: number) => {
			const entry = binaries.find((b) => b.id === binaryDataId);
			if (!entry) {
				throw new Error(`The binary data "${binaryDataId}" was not sent to the sandbox`);
			}
			state.binaryReads++;
			return createReadStream(path.join(inDir, entry.path), { highWaterMark: chunkSize });
		},

		binaryToBuffer: toBuffer,

		binaryToString: async (body: Buffer | Readable, encoding?: string) => {
			const buffer = await toBuffer(body);
			const enc = encoding ?? 'utf-8';
			if (Buffer.isEncoding(enc)) return buffer.toString(enc);
			const iconv = require('iconv-lite') as {
				decode: (b: Buffer, e: string, o?: object) => string;
			};
			return iconv.decode(buffer, enc, { stripBOM: true });
		},

		prepareBinaryData: async (
			binaryData: Buffer | Readable,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData> => {
			const fileName = filePath ? path.basename(filePath) : undefined;
			const fileExtension = fileName?.includes('.') ? fileName.split('.').pop() : undefined;
			const { uuid, size } = await writeOutput(binaryData, { fileName, mimeType });
			const shownMime =
				mimeType ??
				(fileExtension ? MIME_BY_EXTENSION[fileExtension.toLowerCase()] : undefined) ??
				'application/octet-stream';
			return {
				id: `${SANDBOX_OUT_PREFIX}${uuid}`,
				data: 'sandbox',
				mimeType: shownMime,
				fileName,
				fileExtension,
				fileSize: prettyBytes(size),
				bytes: size,
			};
		},

		setBinaryDataBuffer: async (
			metadata: IBinaryData,
			bufferOrStream: Buffer | Readable,
		): Promise<IBinaryData> => {
			const { uuid, size } = await writeOutput(bufferOrStream, {
				fileName: metadata.fileName,
				mimeType: metadata.mimeType,
			});
			return {
				...metadata,
				id: `${SANDBOX_OUT_PREFIX}${uuid}`,
				data: 'sandbox',
				fileSize: prettyBytes(size),
				bytes: size,
			};
		},
	});

	return helpers;
}
