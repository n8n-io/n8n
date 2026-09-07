/* eslint-disable n8n-local-rules/no-dynamic-regexp -- safeRegex worker */
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
	result?: RegExpExecArray | RegExpMatchArray[] | boolean | string | string[] | null;
	error?: string;
};

function withGlobalFlag(flags?: string): string {
	return flags?.includes('g') ? flags : `${flags ?? ''}g`;
}

function executeRegex(request: RegexRequest): RegexResponse['result'] {
	const regex = new RegExp(request.pattern, request.flags);

	switch (request.operation) {
		case 'exec':
			return regex.exec(request.input);
		case 'test':
			return regex.test(request.input);
		case 'replace':
			return request.input.replace(regex, request.replacement ?? '');
		case 'matchAll':
			return Array.from(
				request.input.matchAll(new RegExp(request.pattern, withGlobalFlag(request.flags))),
			);
		case 'split':
			return request.input.split(regex);
	}
}

self.onmessage = ({ data }: MessageEvent<RegexRequest>) => {
	try {
		self.postMessage({
			id: data.id,
			result: executeRegex(data),
		} satisfies RegexResponse);
	} catch (error) {
		self.postMessage({
			id: data.id,
			error: error instanceof Error ? error.message : 'Regular expression execution failed',
		} satisfies RegexResponse);
	}
};
