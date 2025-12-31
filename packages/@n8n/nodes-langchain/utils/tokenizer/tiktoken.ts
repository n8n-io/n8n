import { readFileSync } from 'fs';
import type { TiktokenBPE, TiktokenEncoding, TiktokenModel } from 'js-tiktoken/lite';
import { Tiktoken, getEncodingNameForModel } from 'js-tiktoken/lite';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

const cache: Record<string, Tiktoken> = {};

const loadJSONFile = (filename: string): TiktokenBPE => {
	const filePath = join(__dirname, filename);
	const content = readFileSync(filePath, 'utf-8');
	return jsonParse(content);
};

export function getEncoding(encoding: TiktokenEncoding): Tiktoken {
	if (cache[encoding]) {
		return cache[encoding];
	}

	let jsonData: TiktokenBPE;

	switch (encoding) {
		case 'o200k_base':
			jsonData = loadJSONFile('./o200k_base.json');
			break;
		case 'cl100k_base':
			jsonData = loadJSONFile('./cl100k_base.json');
			break;
		default:
			// Fall back to cl100k_base for unsupported encodings
			jsonData = loadJSONFile('./cl100k_base.json');
	}

	cache[encoding] = new Tiktoken(jsonData);
	return cache[encoding];
}

export function encodingForModel(model: TiktokenModel): Tiktoken {
	return getEncoding(getEncodingNameForModel(model));
}
