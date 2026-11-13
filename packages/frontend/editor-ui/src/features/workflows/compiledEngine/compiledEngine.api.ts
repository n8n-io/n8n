import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { CompileResult } from './compiledEngine.types';

export async function fetchCompileResult(
	context: IRestApiContext,
	workflowId: string,
): Promise<CompileResult> {
	return await makeRestApiRequest<CompileResult>(
		context,
		'GET',
		`/compiled-engine/workflows/${encodeURIComponent(workflowId)}/compile`,
	);
}
