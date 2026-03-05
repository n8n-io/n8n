import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export interface StaticGraph {
	nodes: Array<{
		id: string;
		label: string;
		type: 'trigger' | 'callable';
		method?: string;
		path?: string;
	}>;
	edges: Array<{
		from: string;
		to: string;
		condition?: string;
	}>;
}

export interface ExecutionTrace {
	nodes: Array<{
		id: string;
		label: string;
		type: 'trigger' | 'callable';
		input: unknown;
		output: unknown;
		startedAt: number;
		completedAt: number;
		error?: string;
	}>;
	edges: Array<{ from: string; to: string }>;
	startedAt: number;
	completedAt: number;
	status: 'success' | 'error';
	error?: string;
}

interface RunResponse {
	waitingForWebhook: boolean;
	testWebhookUrl: string;
	staticGraph: StaticGraph;
}

export async function analyzeCode(context: IRestApiContext, code: string): Promise<StaticGraph> {
	return await makeRestApiRequest<StaticGraph>(context, 'POST', '/code-engine/analyze', { code });
}

export async function runCode(
	context: IRestApiContext,
	code: string,
	pushRef: string,
): Promise<RunResponse> {
	return await makeRestApiRequest<RunResponse>(context, 'POST', '/code-engine/run', {
		code,
		pushRef,
	});
}
