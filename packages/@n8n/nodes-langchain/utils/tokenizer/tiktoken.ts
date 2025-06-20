import type { TiktokenBPE, TiktokenEncoding, TiktokenModel } from 'js-tiktoken/lite';
import { Tiktoken, getEncodingNameForModel } from 'js-tiktoken/lite';

import cl100k_base from './cl100k_base.json';
import o200k_base from './o200k_base.json';

export async function getEncoding(encoding: TiktokenEncoding) {
	const encodings = {
		cl100k_base: cl100k_base as TiktokenBPE,
		o200k_base: o200k_base as TiktokenBPE,
	};
	const encodingsMap: Record<TiktokenEncoding, TiktokenBPE> = {
		cl100k_base: encodings.cl100k_base,
		p50k_base: encodings.cl100k_base,
		r50k_base: encodings.cl100k_base,
		gpt2: encodings.cl100k_base,
		p50k_edit: encodings.cl100k_base,
		o200k_base: encodings.o200k_base,
	};

	if (!(encoding in encodingsMap)) {
		return new Tiktoken(cl100k_base);
	}

	return new Tiktoken(encodingsMap[encoding]);
}

export async function encodingForModel(model: TiktokenModel) {
	return await getEncoding(getEncodingNameForModel(model));
}
