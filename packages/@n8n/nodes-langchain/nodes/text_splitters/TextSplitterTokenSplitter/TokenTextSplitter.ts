/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { TokenTextSplitterParams } from '@langchain/textsplitters';
import { TextSplitter } from '@langchain/textsplitters';
import type * as tiktoken from 'js-tiktoken';

import { getEncoding } from '@utils/tokenizer/tiktoken';

/**
 * Implementation of splitter which looks at tokens.
 * This is override of the LangChain TokenTextSplitter
 * to use the n8n tokenizer utility which uses local JSON encodings
 */
export class TokenTextSplitter extends TextSplitter implements TokenTextSplitterParams {
	static lc_name() {
		return 'TokenTextSplitter';
	}

	encodingName: tiktoken.TiktokenEncoding;

	allowedSpecial: 'all' | string[];

	disallowedSpecial: 'all' | string[];

	private tokenizer: tiktoken.Tiktoken | undefined;

	constructor(fields?: Partial<TokenTextSplitterParams>) {
		super(fields);

		this.encodingName = fields?.encodingName ?? 'cl100k_base';
		this.allowedSpecial = fields?.allowedSpecial ?? [];
		this.disallowedSpecial = fields?.disallowedSpecial ?? 'all';
	}

	async splitText(text: string): Promise<string[]> {
		if (!this.tokenizer) {
			this.tokenizer = await getEncoding(this.encodingName);
		}

		const splits: string[] = [];
		const textSize = text.length;

		console.log(
			`[Tiktoken Benchmark - TextSplitter] Starting text splitting for ${textSize} bytes`,
		);
		console.time(`tiktoken-text-splitter-encode-${textSize}bytes`);

		const startTime = Date.now();
		const input_ids = this.tokenizer.encode(text, this.allowedSpecial, this.disallowedSpecial);
		const encodeTime = Date.now() - startTime;

		console.timeEnd(`tiktoken-text-splitter-encode-${textSize}bytes`);
		console.log(
			`[Tiktoken Benchmark - TextSplitter] Encoding time: ${encodeTime}ms, Text size: ${textSize} bytes, Token count: ${input_ids.length}, Ratio: ${(textSize / input_ids.length).toFixed(2)} chars/token`,
		);

		let start_idx = 0;
		let chunkCount = 0;
		const decodeStartTime = Date.now();

		while (start_idx < input_ids.length) {
			if (start_idx > 0) {
				start_idx -= this.chunkOverlap;
			}
			const end_idx = Math.min(start_idx + this.chunkSize, input_ids.length);
			const chunk_ids = input_ids.slice(start_idx, end_idx);

			console.time(`tiktoken-decode-chunk-${chunkCount}`);
			splits.push(this.tokenizer.decode(chunk_ids));
			console.timeEnd(`tiktoken-decode-chunk-${chunkCount}`);

			chunkCount++;
			start_idx = end_idx;
		}

		const decodeTime = Date.now() - decodeStartTime;
		const totalTime = Date.now() - startTime;

		console.log(
			`[Tiktoken Benchmark - TextSplitter] Total chunks created: ${chunkCount}, Decode time: ${decodeTime}ms, Total time: ${totalTime}ms`,
		);

		return splits;
	}
}
