import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { HttpHeaderExtractor } from './http-header-extractor';

/**
 * Extracts bearer tokens from the Authorization HTTP header.
 *
 * Automatically extracts tokens from headers in the format:
 * - `Authorization: Bearer <token>`
 * - Case-insensitive "Bearer" prefix
 *
 * The extracted token becomes the credential identity for OAuth2 introspection.
 *
 * @example
 * // Request header:
 * // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * // Result:
 * // context.credentials.identity = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
@ContextEstablishmentHook()
export class BearerTokenExtractor implements IContextEstablishmentHook {
	constructor(private readonly httpHeaderExtractor: HttpHeaderExtractor) {}

	hookDescription: HookDescription = {
		name: 'BearerTokenExtractor',
		displayName: 'Bearer Token Extractor',
		options: [],
	};

	isApplicableToTriggerNode(nodeType: string): boolean {
		return this.httpHeaderExtractor.isApplicableToTriggerNode(nodeType);
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		return await this.httpHeaderExtractor.execute({
			...options,
			options: {
				headerName: 'authorization',
				headerValue: '[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
			},
		});
	}
}
