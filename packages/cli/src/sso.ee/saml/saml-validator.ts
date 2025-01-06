import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';
import type { XMLFileInfo, XMLLintOptions, XMLValidationResult } from 'xmllint-wasm';

@Service()
export class SamlValidator {
	private xmlMetadata: XMLFileInfo;

	private xmlProtocol: XMLFileInfo;

	private preload: XMLFileInfo[] = [];

	constructor(private readonly logger: Logger) {}

	private xmllint: {
		validateXML: (options: XMLLintOptions) => Promise<XMLValidationResult>;
	};

	async init() {
		await this.loadSchemas();
		this.xmllint = await import('xmllint-wasm');
	}

	async validateMetadata(metadata: string): Promise<boolean> {
		return await this.validateXml('metadata', metadata);
	}

	async validateResponse(response: string): Promise<boolean> {
		return await this.validateXml('response', response);
	}

	// dynamically load schema files
	private async loadSchemas(): Promise<void> {
		this.xmlProtocol = (await import('./schema/saml-schema-protocol-2.0.xsd')).xmlFileInfo;
		this.xmlMetadata = (await import('./schema/saml-schema-metadata-2.0.xsd')).xmlFileInfo;
		this.preload = (
			await Promise.all([
				// SAML
				import('./schema/saml-schema-assertion-2.0.xsd'),
				import('./schema/xmldsig-core-schema.xsd'),
				import('./schema/xenc-schema.xsd'),
				import('./schema/xml.xsd'),

				// WS-Federation
				import('./schema/ws-federation.xsd'),
				import('./schema/oasis-200401-wss-wssecurity-secext-1.0.xsd'),
				import('./schema/oasis-200401-wss-wssecurity-utility-1.0.xsd'),
				import('./schema/ws-addr.xsd'),
				import('./schema/metadata-exchange.xsd'),
				import('./schema/ws-securitypolicy-1.2.xsd'),
				import('./schema/ws-authorization.xsd'),
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
