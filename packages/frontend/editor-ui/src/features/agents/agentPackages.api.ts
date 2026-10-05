import type {
	ExportPackageRequestDto,
	ImportPackageRequestDto,
	ImportResult,
} from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import { makeRestApiRequest, ResponseError, type IRestApiContext } from '@n8n/rest-api-client';
import { isRecord } from '@n8n/utils/is-record';

export async function exportAgentPackage(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: Partial<ExportPackageRequestDto> = {},
): Promise<Blob> {
	const response = await fetch(
		`${context.baseUrl}/projects/${projectId}/agents/v2/${agentId}/package`,
		{
			method: 'POST',
			credentials: 'include',
			headers: {
				'browser-id': getBrowserId(),
				'push-ref': context.pushRef,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(options),
		},
	);
	if (!response.ok) {
		const body: unknown = await response.json().catch(() => null);
		throw new ResponseError(
			isRecord(body) && typeof body.message === 'string' ? body.message : response.statusText,
			{ httpStatusCode: response.status },
		);
	}
	return await response.blob();
}

export async function importAgentPackage(
	context: IRestApiContext,
	projectId: string,
	file: File,
	options: Partial<ImportPackageRequestDto> = {},
): Promise<ImportResult> {
	const data = new FormData();
	data.append('package', file);
	for (const [key, value] of Object.entries(options)) {
		if (value !== undefined) {
			data.append(key, typeof value === 'string' ? value : JSON.stringify(value));
		}
	}
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/package`,
		data,
	);
}
