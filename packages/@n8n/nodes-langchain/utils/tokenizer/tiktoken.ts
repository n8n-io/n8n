import { readFile } from 'fs/promises';
import type { TiktokenBPE, TiktokenEncoding, TiktokenModel } from 'js-tiktoken/lite';
import { Tiktoken, getEncodingNameForModel } from 'js-tiktoken/lite';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

const cache: Record<string, Tiktoken> = {};

const loadJSONFile = async (filename: string): Promise<TiktokenBPE> => {
	const filePath = join(__dirname, filename);
	const content = await readFile(filePath, 'utf-8');
	return await jsonParse(content);
};

export async function getEncoding(encoding: TiktokenEncoding): Promise<Tiktoken> {
	if (cache[encoding]) {
		return cache[encoding];
	}

	let jsonData: TiktokenBPE;

	switch (encoding) {
		case 'o200k_base':
			jsonData = await loadJSONFile('./o200k_base.json');
			break;
		case 'cl100k_base':
			jsonData = await loadJSONFile('./cl100k_base.json');
			break;
		default:
			// Fall back to cl100k_base for unsupported encodings
			jsonData = await loadJSONFile('./cl100k_base.json');
	}

	cache[encoding] = new Tiktoken(jsonData);
	return cache[encoding];
}

export async function encodingForModel(model: TiktokenModel): Promise<Tiktoken> {
	return await getEncoding(getEncodingNameForModel(model));
}
