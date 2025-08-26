import { readFile } from 'fs/promises';
import type { TiktokenBPE, TiktokenEncoding, TiktokenModel } from 'js-tiktoken/lite';
import { Tiktoken, getEncodingNameForModel } from 'js-tiktoken/lite';
import { jsonParse } from 'n8n-workflow';
import { join } from 'path';

const cache: Record<string, Tiktoken> = {};
const loadingPromises: Record<string, Promise<Tiktoken> | undefined> = {};

const loadJSONFile = async (filename: string): Promise<TiktokenBPE> => {
	const filePath = join(__dirname, filename);
	const content = await readFile(filePath, 'utf-8');
	return await jsonParse(content);
};

export async function getEncoding(encoding: TiktokenEncoding): Promise<Tiktoken> {
	if (cache[encoding]) {
		return cache[encoding];
	}

	// Check if we're already loading this encoding
	if (loadingPromises[encoding]) {
		return await loadingPromises[encoding];
	}

	// Create a promise for loading this encoding
	loadingPromises[encoding] = (async () => {
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

		const tiktoken = new Tiktoken(jsonData);
		cache[encoding] = tiktoken;
		// Clean up the loading promise after completion
		delete loadingPromises[encoding];
		return tiktoken;
	})();

	return await loadingPromises[encoding];
}

export async function encodingForModel(model: TiktokenModel): Promise<Tiktoken> {
	return await getEncoding(getEncodingNameForModel(model));
}
