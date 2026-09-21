import type { ApplyPackageResultDto, ContinueApplyPackageDto } from '@n8n/api-types';
import { request, type PublicApiContext } from '@n8n/rest-api-client';

export const applyPackage = async (
	context: PublicApiContext,
	connectionId: string,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/promotions/connections/${connectionId}/apply`,
	});

export const continueApplyPackage = async (
	context: PublicApiContext,
	connectionId: string,
	data: ContinueApplyPackageDto,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/promotions/connections/${connectionId}/apply/continue`,
		data,
	});
