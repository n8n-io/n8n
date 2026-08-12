import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export interface EnvironmentVariable {
	name: string;
	value: string;
}

/** File staged from the input item's binary data (`PUT /jobs/{id}/files`). */
export interface ContainerBinaryFile {
	source: 'binary';
	path: string;
	fileName: string;
	mimeType?: string;
	size: number;
	content: Buffer;
}

/** File downloaded server-side by the sandbox (`POST /jobs/{id}/files/fetch`, contract v1.1). */
export interface ContainerUrlFile {
	source: 'url';
	path: string;
	url: string;
}

export type ContainerFile = ContainerBinaryFile | ContainerUrlFile;

export interface ContainerRunRequest {
	image: string;
	command?: string;
	args: string[];
	env: EnvironmentVariable[];
	files: ContainerFile[];
	timeoutSeconds: number;
}

export interface ContainerRunResult {
	jobId: string;
	image: string;
	cmd: string[] | null;
	envNames: string[];
	files: Array<{ path: string; size?: number; url?: string }>;
	pulledImage: boolean;
	exitCode: number;
	success: boolean;
	timedOut: boolean;
	killed: boolean;
	executionTimeMs: number;
	stdout: string;
	stderr: string;
}

const FILE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/;

export const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

const LOG_PAYLOAD_MAX_CHARS = 4000;

/**
 * Validates a job file path per contract v1: relative, `^[A-Za-z0-9._/-]+$`,
 * no leading `/`, no `..` segments. The file appears at `/n8n/<path>`.
 */
export const isValidJobFilePath = (path: string): boolean =>
	FILE_PATH_PATTERN.test(path) && !path.startsWith('/') && !path.split('/').includes('..');

export const truncateForLog = (payload: string): string =>
	payload.length > LOG_PAYLOAD_MAX_CHARS
		? `${payload.slice(0, LOG_PAYLOAD_MAX_CHARS)}… (${payload.length} chars total)`
		: payload;

/** Renders a payload for logging without ever throwing on circular structures. */
export const describePayload = (payload: unknown): string => {
	if (payload === undefined) {
		return '<empty>';
	}
	if (Buffer.isBuffer(payload)) {
		return `<binary ${payload.length} bytes>`;
	}
	if (typeof payload === 'object' && payload !== null && 'pipe' in payload) {
		return '<stream>';
	}
	try {
		return truncateForLog(JSON.stringify(payload));
	} catch {
		return '<unserializable payload>';
	}
};

/**
 * The container `cmd`, Docker semantics: it overrides the image CMD and is
 * passed to the image's own entrypoint. A command-less argv list is valid.
 */
export const buildCmd = (request: ContainerRunRequest): string[] => [
	...(request.command === undefined ? [] : [request.command]),
	...request.args,
];

/** The staged files as reported in the run result. */
export const describeFiles = (
	files: ContainerFile[],
): Array<{ path: string; size?: number; url?: string }> =>
	files.map((file) =>
		file.source === 'binary'
			? { path: file.path, size: file.size }
			: { path: file.path, url: file.url },
	);

export function getSandboxConfig(this: IExecuteFunctions): { baseUrl: string; apiKey: string } {
	const { n8nSandboxServiceUrl, n8nSandboxServiceApiKey } = Container.get(GlobalConfig).instanceAi;
	if (n8nSandboxServiceUrl === '') {
		this.logger.error('Docker node: sandbox service is not configured', {
			envVars: ['N8N_SANDBOX_SERVICE_URL', 'N8N_SANDBOX_SERVICE_API_KEY'],
		});
		throw new NodeOperationError(this.getNode(), 'The sandbox service is not configured', {
			description:
				'Set the N8N_SANDBOX_SERVICE_URL and N8N_SANDBOX_SERVICE_API_KEY environment variables',
		});
	}
	return {
		baseUrl: n8nSandboxServiceUrl.replace(/\/+$/, ''),
		apiKey: n8nSandboxServiceApiKey,
	};
}
