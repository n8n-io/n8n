import type { RegexEngineAsync } from 'n8n-workflow';

const REGEX_TIMEOUT_MS = 250;
const REGEX_TIMEOUT_ERROR_MESSAGE = 'Regular expression execution timed out';

type RegexOperation = 'exec' | 'test' | 'replace' | 'matchAll' | 'split';

type RegexRequest = {
	id: number;
	operation: RegexOperation;
	pattern: string;
	input: string;
	flags?: string;
	replacement?: string;
};

type RegexResponse = {
	id: number;
	result?: unknown;
	error?: string;
};

let requestId = 0;

function isRegExpMatch(value: unknown): value is RegExpMatchArray {
	return (
		Array.isArray(value) &&
		typeof Reflect.get(value, 'index') === 'number' &&
		typeof Reflect.get(value, 'input') === 'string'
	);
}

function isRegExpMatchOrNull(value: unknown): value is RegExpExecArray | null {
	return value === null || isRegExpMatch(value);
}

function isRegExpMatchArray(value: unknown): value is RegExpMatchArray[] {
	return Array.isArray(value) && value.every(isRegExpMatch);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export class WorkerRegexEngine implements RegexEngineAsync {
	async exec(pattern: string, input: string, flags?: string): Promise<RegExpExecArray | null> {
		const result = await this.execute('exec', pattern, input, flags);
		if (!isRegExpMatchOrNull(result)) throw new Error('Unexpected regex execution result');
		return result;
	}

	async test(pattern: string, input: string, flags?: string): Promise<boolean> {
		const result = await this.execute('test', pattern, input, flags);
		if (typeof result !== 'boolean') throw new Error('Unexpected regex execution result');
		return result;
	}

	async replace(
		pattern: string,
		input: string,
		flags: string | undefined,
		replacement: string,
	): Promise<string> {
		const result = await this.execute('replace', pattern, input, flags, replacement);
		if (typeof result !== 'string') throw new Error('Unexpected regex execution result');
		return result;
	}

	async matchAll(pattern: string, input: string, flags?: string): Promise<RegExpMatchArray[]> {
		const result = await this.execute('matchAll', pattern, input, flags);
		if (!isRegExpMatchArray(result)) throw new Error('Unexpected regex execution result');
		return result;
	}

	async split(pattern: string, input: string, flags?: string): Promise<string[]> {
		const result = await this.execute('split', pattern, input, flags);
		if (!isStringArray(result)) throw new Error('Unexpected regex execution result');
		return result;
	}

	private async execute(
		operation: RegexOperation,
		pattern: string,
		input: string,
		flags: string | undefined,
		replacement?: string,
	): Promise<unknown> {
		const worker = new Worker(new URL('./safeRegex.worker.ts', import.meta.url), {
			type: 'module',
		});
		const id = requestId++;

		return await new Promise<unknown>((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				worker.terminate();
				reject(new Error(REGEX_TIMEOUT_ERROR_MESSAGE));
			}, REGEX_TIMEOUT_MS);

			worker.onmessage = ({ data }: MessageEvent<RegexResponse>) => {
				if (data.id !== id) return;

				window.clearTimeout(timeout);
				worker.terminate();

				if (data.error) {
					reject(new Error(data.error));
					return;
				}

				resolve(data.result);
			};

			worker.onerror = () => {
				window.clearTimeout(timeout);
				worker.terminate();
				reject(new Error('Regular expression execution failed'));
			};

			worker.postMessage({
				id,
				operation,
				pattern,
				input,
				flags,
				replacement,
			} satisfies RegexRequest);
		});
	}
}

export const safeRegexAsync: RegexEngineAsync = new WorkerRegexEngine();
