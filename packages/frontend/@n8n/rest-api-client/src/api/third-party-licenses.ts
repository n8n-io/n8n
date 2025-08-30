import type { IRestApiContext } from '../types';

export function getThirdPartyLicensesDownloadUrl(context: IRestApiContext): string {
	return `${context.baseUrl}/third-party-licenses`;
}
