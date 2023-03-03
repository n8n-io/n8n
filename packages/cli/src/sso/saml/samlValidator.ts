import { LoggerProxy } from 'n8n-workflow';
import type { XMLFileInfo } from 'xmllint-wasm';
import { validateXML } from 'xmllint-wasm';
import { xsdSamlSchemaAssertion20 } from './schema/saml-schema-assertion-2.0.xsd';
import { xsdSamlSchemaMetadata20 } from './schema/saml-schema-metadata-2.0.xsd';
import { xsdSamlSchemaProtocol20 } from './schema/saml-schema-protocol-2.0.xsd';
import { xsdXenc } from './schema/xenc-schema.xsd';
import { xsdXml } from './schema/xml.xsd';
import { xsdXmldsigCore } from './schema/xmldsig-core-schema.xsd';

const xml: XMLFileInfo = {
	fileName: 'xml.xsd',
	contents: xsdXml,
};

const xmldsigCore: XMLFileInfo = {
	fileName: 'xmldsig-core-schema.xsd',
	contents: xsdXmldsigCore,
};

const xmlXenc: XMLFileInfo = {
	fileName: 'xenc-schema.xsd',
	contents: xsdXenc,
};

const xmlMetadata: XMLFileInfo = {
	fileName: 'saml-schema-metadata-2.0.xsd',
	contents: xsdSamlSchemaMetadata20,
};

const xmlAssertion: XMLFileInfo = {
	fileName: 'saml-schema-assertion-2.0.xsd',
	contents: xsdSamlSchemaAssertion20,
};

const xmlProtocol: XMLFileInfo = {
	fileName: 'saml-schema-protocol-2.0.xsd',
	contents: xsdSamlSchemaProtocol20,
};

export async function validateMetadata(metadata: string): Promise<boolean> {
	try {
		const validationResult = await validateXML({
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
		if (validationResult.valid) {
			LoggerProxy.debug('SAML Metadata is valid');
			return true;
		} else {
			LoggerProxy.warn('SAML Validate Metadata: Invalid metadata');
			LoggerProxy.warn(validationResult.errors.join('\n'));
		}
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		LoggerProxy.warn(error);
	}
	return false;
}

export async function validateResponse(response: string): Promise<boolean> {
	try {
		const validationResult = await validateXML({
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
		if (validationResult.valid) {
			LoggerProxy.debug('SAML Response is valid');
			return true;
		} else {
			LoggerProxy.warn('SAML Validate Response: Failed');
			LoggerProxy.warn(validationResult.errors.join('\n'));
		}
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		LoggerProxy.warn(error);
	}
	return false;
}
