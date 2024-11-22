import { Container } from 'typedi';
import type { XMLFileInfo } from 'xmllint-wasm';

import { Logger } from '@/logging/logger.service';

let xmlMetadata: XMLFileInfo;
let xmlProtocol: XMLFileInfo;

let preload: XMLFileInfo[] = [];

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let xmllintWasm: typeof import('xmllint-wasm') | undefined;

// dynamically load schema files
async function loadSchemas(): Promise<void> {
	xmlProtocol = (await import('./schema/saml-schema-protocol-2.0.xsd')).xmlFileInfo;
	xmlMetadata = (await import('./schema/saml-schema-metadata-2.0.xsd')).xmlFileInfo;
	preload = (
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

// dynamically load xmllint-wasm
async function loadXmllintWasm(): Promise<void> {
	if (xmllintWasm === undefined) {
		Container.get(Logger).debug('Loading xmllint-wasm library into memory');
		xmllintWasm = await import('xmllint-wasm');
	}
}

export async function validateMetadata(metadata: string): Promise<boolean> {
	const logger = Container.get(Logger);
	try {
		await loadXmllintWasm();
		await loadSchemas();
		const validationResult = await xmllintWasm?.validateXML({
			xml: [
				{
					fileName: 'metadata.xml',
					contents: metadata,
				},
			],
			extension: 'schema',
			schema: [xmlMetadata],
			preload: [xmlProtocol, ...preload],
		});
		if (validationResult?.valid) {
			logger.debug('SAML Metadata is valid');
			return true;
		} else {
			logger.warn('SAML Validate Metadata: Invalid metadata');
			logger.warn(
				validationResult
					? validationResult.errors
							.map((error) => `${error.message} - ${error.rawMessage}`)
							.join('\n')
					: '',
			);
		}
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		logger.warn(error);
	}
	return false;
}

export async function validateResponse(response: string): Promise<boolean> {
	const logger = Container.get(Logger);
	try {
		await loadXmllintWasm();
		await loadSchemas();
		const validationResult = await xmllintWasm?.validateXML({
			xml: [
				{
					fileName: 'response.xml',
					contents: response,
				},
			],
			extension: 'schema',
			schema: [xmlProtocol],
			preload: [xmlMetadata, ...preload],
		});
		if (validationResult?.valid) {
			logger.debug('SAML Response is valid');
			return true;
		} else {
			logger.warn('SAML Validate Response: Failed');
			logger.warn(
				validationResult
					? validationResult.errors
							.map((error) => `${error.message} - ${error.rawMessage}`)
							.join('\n')
					: '',
			);
		}
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		logger.warn(error);
	}
	return false;
}
