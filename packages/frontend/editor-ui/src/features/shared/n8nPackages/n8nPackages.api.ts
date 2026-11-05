import {
	importBlockingIssueSchema,
	type ExportPackageRequestDto,
	type ImportBlockingIssue,
	type ImportPackageRequestDto,
	type ImportResultDto,
} from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { request, requestResponse, ResponseError } from '@n8n/rest-api-client';

const packagesApiRoot = '/n8n-packages';

const BLOCKED_IMPORT_STATUS_CODES = [409, 422];

export type ImportPackageOptions = Pick<ImportPackageRequestDto, 'projectId' | 'conflictPolicy'>;

/** Exports a package. Fields that the body leaves out use the server defaults. */
export async function exportPackage(
	context: PublicApiContext,
	body: Partial<ExportPackageRequestDto>,
): Promise<Blob> {
	const response = await requestResponse<Blob>({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${packagesApiRoot}/export`,
		data: body,
		responseType: 'blob',
	});
	return response.data;
}

export async function importPackage(
	context: PublicApiContext,
	file: File,
	options: ImportPackageOptions,
): Promise<ImportResultDto> {
	const formData = new FormData();
	formData.append('package', file);
	formData.append('conflictPolicy', options.conflictPolicy);
	if (options.projectId) formData.append('projectId', options.projectId);

	return await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${packagesApiRoot}/import`,
		data: formData,
	});
}

/**
 * Returns the issues of a blocked import, or `undefined` for every other error.
 * An issue list that does not match the schema also gives `undefined`, so the caller shows only the server message.
 */
export function getImportBlockingIssues(error: unknown): ImportBlockingIssue[] | undefined {
	if (!(error instanceof ResponseError)) return undefined;
	if (!BLOCKED_IMPORT_STATUS_CODES.includes(error.httpStatusCode ?? 0)) return undefined;

	const parsed = importBlockingIssueSchema.array().safeParse(error.meta?.issues);
	return parsed.success ? parsed.data : undefined;
}
