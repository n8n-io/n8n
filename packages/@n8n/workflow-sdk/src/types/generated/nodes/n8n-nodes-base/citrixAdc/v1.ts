/**
 * Netscaler ADC Node - Version 1
 * Consume Netscaler ADC API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CitrixAdcV1CertificateCreateConfig = {
	resource: 'certificate';
	operation: 'create';
/**
 * Name for and, optionally, path to the generated certificate file. /nsconfig/ssl/ is the default path.
 * @displayOptions.show { resource: ["certificate"], operation: ["create"] }
 */
		certificateFileName: string | Expression<string>;
/**
 * Format in which the certificate is stored on the appliance
 * @displayOptions.show { resource: ["certificate"], operation: ["create"] }
 * @default PEM
 */
		certificateFormat: 'PEM' | 'DER' | Expression<string>;
	certificateType: 'ROOT_CERT' | 'INTM_CERT' | 'SRVR_CERT' | 'CLNT_CERT' | Expression<string>;
/**
 * Name for and, optionally, path to the certificate-signing request (CSR). /nsconfig/ssl/ is the default path.
 * @displayOptions.show { operation: ["create"], resource: ["certificate"] }
 */
		certificateRequestFileName: string | Expression<string>;
/**
 * Name of the CA certificate file that issues and signs the Intermediate-CA certificate or the end-user client and server certificates
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["INTM_CERT", "SRVR_CERT", "CLNT_CERT"] }
 */
		caCertificateFileName: string | Expression<string>;
/**
 * Format of the CA certificate
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["INTM_CERT", "SRVR_CERT", "CLNT_CERT"] }
 * @default PEM
 */
		caCertificateFileFormat: 'PEM' | 'DER' | Expression<string>;
/**
 * Private key, associated with the CA certificate that is used to sign the Intermediate-CA certificate or the end-user client and server certificate. If the CA key file is password protected, the user is prompted to enter the pass phrase that was used to encrypt the key.
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["INTM_CERT", "SRVR_CERT", "CLNT_CERT"] }
 */
		caPrivateKeyFileName: string | Expression<string>;
/**
 * Format of the CA certificate
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["INTM_CERT", "SRVR_CERT", "CLNT_CERT"] }
 * @default PEM
 */
		caPrivateKeyFileFormat: 'PEM' | 'DER' | Expression<string>;
/**
 * Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Netscaler ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.
 * @displayOptions.show { operation: ["create"], resource: ["certificate"], certificateType: ["ROOT_CERT"] }
 */
		privateKeyFileName: string | Expression<string>;
/**
 * Serial number file maintained for the CA certificate. This file contains the serial number of the next certificate to be issued or signed by the CA.
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["INTM_CERT", "SRVR_CERT", "CLNT_CERT"] }
 */
		caSerialFileNumber: string | Expression<string>;
/**
 * Format in which the key is stored on the appliance
 * @displayOptions.show { resource: ["certificate"], operation: ["create"], certificateType: ["ROOT_CERT"] }
 * @default PEM
 */
		privateKeyFormat: 'PEM' | 'DER' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CitrixAdcV1CertificateInstallConfig = {
	resource: 'certificate';
	operation: 'install';
/**
 * Name for the certificate and private-key pair
 * @displayOptions.show { resource: ["certificate"], operation: ["install"] }
 */
		certificateKeyPairName: string | Expression<string>;
/**
 * Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.
 * @displayOptions.show { resource: ["certificate"], operation: ["install"] }
 */
		certificateFileName: string | Expression<string>;
/**
 * Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.
 * @displayOptions.show { resource: ["certificate"], operation: ["install"] }
 */
		privateKeyFileName: string | Expression<string>;
/**
 * Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.
 * @displayOptions.show { resource: ["certificate"], operation: ["install"] }
 * @default PEM
 */
		certificateFormat: 'PEM' | 'DER' | Expression<string>;
/**
 * Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.
 * @displayOptions.show { resource: ["certificate"], operation: ["install"], certificateFormat: ["PEM"] }
 */
		password: string | Expression<string>;
/**
 * Whether to alert when the certificate is about to expire
 * @displayOptions.show { resource: ["certificate"], operation: ["install"] }
 * @default false
 */
		notifyExpiration: boolean | Expression<boolean>;
/**
 * Time, in number of days, before certificate expiration, at which to generate an alert that the certificate is about to expire
 * @displayOptions.show { resource: ["certificate"], operation: ["install"], notifyExpiration: [true] }
 * @default 10
 */
		notificationPeriod: number | Expression<number>;
/**
 * Whether to parse the certificate chain as a single file after linking the server certificate to its issuer's certificate within the file
 * @displayOptions.show { resource: ["certificate"], operation: ["install"], certificateFormat: ["PEM"] }
 * @default false
 */
		certificateBundle?: boolean | Expression<boolean>;
};

export type CitrixAdcV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	fileLocation: string | Expression<string>;
/**
 * Name of the file. It should not include filepath.
 * @displayOptions.show { operation: ["delete", "download"], resource: ["file"] }
 */
		fileName: string | Expression<string>;
};

export type CitrixAdcV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	fileLocation: string | Expression<string>;
/**
 * Name of the file. It should not include filepath.
 * @displayOptions.show { operation: ["delete", "download"], resource: ["file"] }
 */
		fileName: string | Expression<string>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["download"], resource: ["file"] }
 * @default data
 */
		binaryProperty: string | Expression<string>;
};

export type CitrixAdcV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	fileLocation: string | Expression<string>;
/**
 * The name of the incoming field containing the binary file data to be processed
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default data
 */
		binaryProperty: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CitrixAdcV1Params =
	| CitrixAdcV1CertificateCreateConfig
	| CitrixAdcV1CertificateInstallConfig
	| CitrixAdcV1FileDeleteConfig
	| CitrixAdcV1FileDownloadConfig
	| CitrixAdcV1FileUploadConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CitrixAdcV1Credentials {
	citrixAdcApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CitrixAdcV1NodeBase {
	type: 'n8n-nodes-base.citrixAdc';
	version: 1;
	credentials?: CitrixAdcV1Credentials;
}

export type CitrixAdcV1CertificateCreateNode = CitrixAdcV1NodeBase & {
	config: NodeConfig<CitrixAdcV1CertificateCreateConfig>;
};

export type CitrixAdcV1CertificateInstallNode = CitrixAdcV1NodeBase & {
	config: NodeConfig<CitrixAdcV1CertificateInstallConfig>;
};

export type CitrixAdcV1FileDeleteNode = CitrixAdcV1NodeBase & {
	config: NodeConfig<CitrixAdcV1FileDeleteConfig>;
};

export type CitrixAdcV1FileDownloadNode = CitrixAdcV1NodeBase & {
	config: NodeConfig<CitrixAdcV1FileDownloadConfig>;
};

export type CitrixAdcV1FileUploadNode = CitrixAdcV1NodeBase & {
	config: NodeConfig<CitrixAdcV1FileUploadConfig>;
};

export type CitrixAdcV1Node =
	| CitrixAdcV1CertificateCreateNode
	| CitrixAdcV1CertificateInstallNode
	| CitrixAdcV1FileDeleteNode
	| CitrixAdcV1FileDownloadNode
	| CitrixAdcV1FileUploadNode
	;