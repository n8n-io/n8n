/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { TokenTextSplitterParams } from '@langchain/textsplitters';
import { TextSplitter } from '@langchain/textsplitters';
import type * as tiktoken from 'js-tiktoken';

import { hasLongSequentialRepeat } from '@utils/helpers';
import { getEncoding } from '@utils/tokenizer/tiktoken';
import { estimateTextSplitsByTokens } from '@utils/tokenizer/token-estimator';

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
		try {
			// Validate input
			if (!text || typeof text !== 'string') {
				return [];
			}

			// Check for repetitive content
			if (hasLongSequentialRepeat(text)) {
				const splits = estimateTextSplitsByTokens(
					text,
					this.chunkSize,
					this.chunkOverlap,
					this.encodingName,
				);
				return splits;
			}

			// Use tiktoken for normal text
			try {
				if (!this.tokenizer) {
					this.tokenizer = await getEncoding(this.encodingName);
				}

				const splits: string[] = [];
				const input_ids = this.tokenizer.encode(text, this.allowedSpecial, this.disallowedSpecial);

				let start_idx = 0;
				let chunkCount = 0;

				while (start_idx < input_ids.length) {
					if (start_idx > 0) {
						start_idx = Math.max(0, start_idx - this.chunkOverlap);
					}
					const end_idx = Math.min(start_idx + this.chunkSize, input_ids.length);
					const chunk_ids = input_ids.slice(start_idx, end_idx);

					splits.push(this.tokenizer.decode(chunk_ids));

					chunkCount++;
					start_idx = end_idx;
				}

				return splits;
			} catch (tiktokenError) {
				// Fall back to character-based splitting if tiktoken fails
				return estimateTextSplitsByTokens(
					text,
					this.chunkSize,
					this.chunkOverlap,
					this.encodingName,
				);
			}
		} catch (error) {
			// Return empty array on complete failure
			return [];
		}
	}
}
