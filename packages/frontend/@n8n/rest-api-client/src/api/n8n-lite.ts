import type { IRestApiContext } from '../types';
import { requestResponse } from '../utils';

export type LiteTarget = 'linux-arm64' | 'linux-x64' | 'darwin-arm64';

function attachmentFilename(header: unknown): string | undefined {
	return typeof header === 'string' ? header.match(/filename="([^"]+)"/)?.[1] : undefined;
}

export async function downloadLiteBinary(
	context: IRestApiContext,
	workflowId: string,
	target: LiteTarget,
): Promise<{ blob: Blob; filename: string }> {
	const response = await requestResponse<Blob>({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `/n8n-lite/workflows/${workflowId}/binary`,
		headers: { 'push-ref': context.pushRef },
		data: { target },
		responseType: 'blob',
	});
	return {
		blob: response.data,
		filename: attachmentFilename(response.headers['content-disposition']) ?? `workflow-${target}`,
	};
}
