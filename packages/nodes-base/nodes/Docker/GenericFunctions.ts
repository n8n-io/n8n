import type { IExecuteFunctions } from 'n8n-workflow';

export interface EnvironmentVariable {
	name: string;
	value: string;
}

export interface ContainerFile {
	path: string;
	fileName: string;
	mimeType?: string;
	size: number;
	contentBase64: string;
}

export interface ContainerRunRequest {
	image: string;
	entrypoint?: string;
	command?: string;
	args: string[];
	env: EnvironmentVariable[];
	files: ContainerFile[];
	ignorePullCache: boolean;
	timeoutSeconds: number;
}

export interface ContainerRunResult {
	containerId: string;
	image: string;
	entrypoint: string | null;
	command: string | null;
	args: string[];
	envNames: string[];
	files: Array<{ path: string; size: number }>;
	pulledFreshImage: boolean;
	timedOut: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	startedAt: string;
	finishedAt: string;
}

const SANDBOX_BASE_URL = process.env.N8N_SANDBOX_URL ?? 'http://localhost:8585';

/**
 * Runs a container in the DinD sandbox service and resolves with its outcome
 * (exit code, stdout/stderr, timings).
 *
 * TODO(hackmation): currently a stub, no container is executed. Replace the
 * fake below with the real sandbox call once the service exposes it. Files are
 * base64-encoded in the JSON body for now; switch to a multipart/streaming
 * upload so large files don't get buffered and inflated in memory.
 */
export async function runContainer(
	this: IExecuteFunctions,
	request: ContainerRunRequest,
): Promise<ContainerRunResult> {
	// Real call will look like:
	// return await this.helpers.httpRequest({
	// 	method: 'POST',
	// 	url: `${SANDBOX_BASE_URL}/v1/containers/run`,
	// 	body: request,
	// 	json: true,
	// 	// HTTP timeout slightly above the sandbox-side one, which is authoritative
	// 	timeout: (request.timeoutSeconds + 30) * 1000,
	// });
	this.logger.debug('Docker node sandbox stub invoked', {
		sandboxBaseUrl: SANDBOX_BASE_URL,
		image: request.image,
	});

	// Simulate the sandbox round-trip
	await new Promise((resolve) => setTimeout(resolve, 25));

	const startedAt = new Date();
	const finishedAt = new Date(startedAt.getTime() + 42);
	const containerId = Array.from({ length: 12 }, () =>
		Math.floor(Math.random() * 16).toString(16),
	).join('');

	return {
		containerId,
		image: request.image,
		entrypoint: request.entrypoint ?? null,
		command: request.command ?? null,
		args: request.args,
		// Only the names: values can hold secrets and would end up in execution data
		envNames: request.env.map(({ name }) => name),
		files: request.files.map(({ path, size }) => ({ path, size })),
		pulledFreshImage: request.ignorePullCache,
		timedOut: false,
		exitCode: 0,
		stdout: `[sandbox stub] would run image "${request.image}"`,
		stderr: '',
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
	};
}
