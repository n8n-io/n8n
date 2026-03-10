import type {
	ICredentialDataDecryptedObject,
	ISupplyDataFunctions,
	IExecuteFunctions,
} from 'n8n-workflow';
import { isDomainAllowed, NodeOperationError } from 'n8n-workflow';

/**
 * Checks if the URL is allowed based on the allowed domains type and the allowed domains.
 * If the allowed domains type is 'domains', it checks if the URL is in the allowed domains.
 * If the allowed domains type is 'none', it checks if the URL is the same as the base URL in the credentials.
 * @param ctx - The context of the node.
 * @param credentials - The credentials of the node.
 * @param url - The URL to check.
 * @param credentialsUrlKey - The key of the base URL in the credentials.
 */
export const checkDomainRestrictions = (
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	credentials: ICredentialDataDecryptedObject,
	url: string,
	credentialsUrlKey: string = 'url',
): void => {
	const allowedDomainsType = credentials.allowedHttpRequestDomains;
	const restrictedMessage = `Domain not allowed: This credential is restricted from accessing ${url}. `;
	if (allowedDomainsType === 'domains') {
		const allowedDomains = credentials.allowedDomains as string;

		if (!allowedDomains || allowedDomains.trim() === '') {
			throw new NodeOperationError(
				ctx.getNode(),
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		}

		if (!isDomainAllowed(url, { allowedDomains })) {
			throw new NodeOperationError(
				ctx.getNode(),
				restrictedMessage + `Only the following domains are allowed: ${allowedDomains}`,
			);
		}
	}
	if (allowedDomainsType === 'none' && credentials[credentialsUrlKey]) {
		if (url !== credentials[credentialsUrlKey]) {
			throw new NodeOperationError(ctx.getNode(), restrictedMessage);
		}
	}
};
