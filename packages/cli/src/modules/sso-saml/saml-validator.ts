import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IdentityProviderInstance } from 'samlify';
import type { XMLFileInfo, XMLLintOptions, XMLValidationResult } from 'xmllint-wasm';

import { InvalidSamlMetadataError } from './errors/invalid-saml-metadata.error';

@Service()
export class SamlValidator {
	private xmlMetadata: XMLFileInfo;

	private xmlProtocol: XMLFileInfo;

	private preload: XMLFileInfo[] = [];

	constructor(private readonly logger: Logger) {}

	private xmllint: {
		validateXML: (options: XMLLintOptions) => Promise<XMLValidationResult>;
	};

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	private samlify: typeof import('samlify');

	async init() {
		if (this.samlify) return;
		this.samlify = await import('samlify');
		await this.loadSchemas();
		this.xmllint = await import('xmllint-wasm');
	}

	validateIdentityProvider(idp: IdentityProviderInstance) {
		const binding = idp.entityMeta.getSingleSignOnService(
			this.samlify.Constants.wording.binding.redirect,
		);
		if (typeof binding !== 'string') {
			throw new InvalidSamlMetadataError('only SAML redirect binding is supported.');
		}
	}

	async validateMetadata(metadata: string): Promise<boolean> {
		const validXML = await this.validateXml('metadata', metadata);

		if (validXML) {
			const idp = this.samlify.IdentityProvider({
				metadata,
			});
			this.validateIdentityProvider(idp);
		}

		return validXML;
	}

	async validateResponse(response: string): Promise<boolean> {
		return await this.validateXml('response', response);
	}

	// dynamically load schema files
	private async loadSchemas(): Promise<void> {
		this.xmlProtocol = (await import('./schema/saml-schema-protocol-2.0.xsd.js')).xmlFileInfo;
		this.xmlMetadata = (await import('./schema/saml-schema-metadata-2.0.xsd.js')).xmlFileInfo;
		this.preload = (
			await Promise.all([
				// SAML
				import('./schema/saml-schema-assertion-2.0.xsd.js'),
				import('./schema/xmldsig-core-schema.xsd.js'),
				import('./schema/xenc-schema.xsd.js'),
				import('./schema/xml.xsd.js'),

				// WS-Federation
				import('./schema/ws-federation.xsd.js'),
				import('./schema/oasis-200401-wss-wssecurity-secext-1.0.xsd.js'),
				import('./schema/oasis-200401-wss-wssecurity-utility-1.0.xsd.js'),
				import('./schema/ws-addr.xsd.js'),
				import('./schema/metadata-exchange.xsd.js'),
				import('./schema/ws-securitypolicy-1.2.xsd.js'),
				import('./schema/ws-authorization.xsd.js'),
			])
		).map((m) => m.xmlFileInfo);
	}

	private async validateXml(type: 'metadata' | 'response', contents: string): Promise<boolean> {
		const fileName = `${type}.xml`;
		const schema = type === 'metadata' ? [this.xmlMetadata] : [this.xmlProtocol];
		const preload = [type === 'metadata' ? this.xmlProtocol : this.xmlMetadata, ...this.preload];

		try {
			const validationResult = await this.xmllint.validateXML({
				xml: [{ fileName, contents }],
				extension: 'schema',
				schema,
				preload,
			});
			if (validationResult?.valid) {
				this.logger.debug(`SAML ${type} is valid`);
				return true;
			} else {
				this.logger.debug(`SAML ${type} is invalid`);
				this.logger.warn(
					validationResult
						? validationResult.errors
								.map((error) => `${error.message} - ${error.rawMessage}`)
								.join('\n')
						: '',
				);
			}
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.logger.warn(error);
		}
		return false;
	}
}
