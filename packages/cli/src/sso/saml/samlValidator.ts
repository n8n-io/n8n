import { Container } from 'typedi';
import type { XMLFileInfo } from 'xmllint-wasm';
import { Logger } from '@/Logger';

let xml: XMLFileInfo;
let xmldsigCore: XMLFileInfo;
let xmlXenc: XMLFileInfo;
let xmlMetadata: XMLFileInfo;
let xmlAssertion: XMLFileInfo;
let xmlProtocol: XMLFileInfo;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let xmllintWasm: typeof import('xmllint-wasm') | undefined;

// dynamically load schema files
async function loadSchemas(): Promise<void> {
	if (!xml || xml.contents === '') {
		Container.get(Logger).debug('Loading XML schema files for SAML validation into memory');
		const f = await import('./schema/xml.xsd');
		xml = {
			fileName: 'xml.xsd',
			contents: f.xsdXml,
		};
	}
	if (!xmldsigCore || xmldsigCore.contents === '') {
		const f = await import('./schema/xmldsig-core-schema.xsd');
		xmldsigCore = {
			fileName: 'xmldsig-core-schema.xsd',
			contents: f.xsdXmldsigCore,
		};
	}
	if (!xmlXenc || xmlXenc.contents === '') {
		const f = await import('./schema/xenc-schema.xsd');
		xmlXenc = {
			fileName: 'xenc-schema.xsd',
			contents: f.xsdXenc,
		};
	}
	if (!xmlMetadata || xmlMetadata.contents === '') {
		const f = await import('./schema/saml-schema-metadata-2.0.xsd');
		xmlMetadata = {
			fileName: 'saml-schema-metadata-2.0.xsd',
			contents: f.xsdSamlSchemaMetadata20,
		};
	}
	if (!xmlAssertion || xmlAssertion.contents === '') {
		const f = await import('./schema/saml-schema-assertion-2.0.xsd');
		xmlAssertion = {
			fileName: 'saml-schema-assertion-2.0.xsd',
			contents: f.xsdSamlSchemaAssertion20,
		};
	}
	if (!xmlProtocol || xmlProtocol.contents === '') {
		const f = await import('./schema/saml-schema-protocol-2.0.xsd');
		xmlProtocol = {
			fileName: 'saml-schema-protocol-2.0.xsd',
			contents: f.xsdSamlSchemaProtocol20,
		};
	}
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
			preload: [xmlProtocol, xmlAssertion, xmldsigCore, xmlXenc, xml],
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
			preload: [xmlMetadata, xmlAssertion, xmldsigCore, xmlXenc, xml],
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
