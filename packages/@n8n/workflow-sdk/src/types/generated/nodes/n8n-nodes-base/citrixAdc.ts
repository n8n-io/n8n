/**
 * Netscaler ADC Node Types
 *
 * Consume Netscaler ADC API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/citrixadc/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CitrixAdcV1CertificateCreateConfig = {
	resource: 'certificate';
	operation: 'create';
	/**
	 * Name for and, optionally, path to the generated certificate file. /nsconfig/ssl/ is the default path.
	 */
	certificateFileName: string | Expression<string>;
	/**
	 * Format in which the certificate is stored on the appliance
	 * @default PEM
	 */
	certificateFormat: 'PEM' | 'DER' | Expression<string>;
	certificateType: 'ROOT_CERT' | 'INTM_CERT' | 'SRVR_CERT' | 'CLNT_CERT' | Expression<string>;
	/**
	 * Name for and, optionally, path to the certificate-signing request (CSR). /nsconfig/ssl/ is the default path.
	 */
	certificateRequestFileName: string | Expression<string>;
	/**
	 * Name of the CA certificate file that issues and signs the Intermediate-CA certificate or the end-user client and server certificates
	 */
	caCertificateFileName: string | Expression<string>;
	/**
	 * Format of the CA certificate
	 * @default PEM
	 */
	caCertificateFileFormat: 'PEM' | 'DER' | Expression<string>;
	/**
	 * Private key, associated with the CA certificate that is used to sign the Intermediate-CA certificate or the end-user client and server certificate. If the CA key file is password protected, the user is prompted to enter the pass phrase that was used to encrypt the key.
	 */
	caPrivateKeyFileName: string | Expression<string>;
	/**
	 * Format of the CA certificate
	 * @default PEM
	 */
	caPrivateKeyFileFormat: 'PEM' | 'DER' | Expression<string>;
	/**
	 * Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Netscaler ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.
	 */
	privateKeyFileName: string | Expression<string>;
	/**
	 * Serial number file maintained for the CA certificate. This file contains the serial number of the next certificate to be issued or signed by the CA.
	 */
	caSerialFileNumber: string | Expression<string>;
	/**
	 * Format in which the key is stored on the appliance
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
	 */
	certificateKeyPairName: string | Expression<string>;
	/**
	 * Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.
	 */
	certificateFileName: string | Expression<string>;
	/**
	 * Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.
	 */
	privateKeyFileName: string | Expression<string>;
	/**
	 * Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.
	 * @default PEM
	 */
	certificateFormat: 'PEM' | 'DER' | Expression<string>;
	/**
	 * Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.
	 */
	password: string | Expression<string>;
	/**
	 * Whether to alert when the certificate is about to expire
	 * @default false
	 */
	notifyExpiration: boolean | Expression<boolean>;
	/**
	 * Time, in number of days, before certificate expiration, at which to generate an alert that the certificate is about to expire
	 * @default 10
	 */
	notificationPeriod: number | Expression<number>;
	/**
	 * Whether to parse the certificate chain as a single file after linking the server certificate to its issuer's certificate within the file
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
	 */
	fileName: string | Expression<string>;
};

export type CitrixAdcV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	fileLocation: string | Expression<string>;
	/**
	 * Name of the file. It should not include filepath.
	 */
	fileName: string | Expression<string>;
	/**
	 * The name of the output field to put the binary file data in
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
	| CitrixAdcV1FileUploadConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CitrixAdcV1Credentials {
	citrixAdcApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type CitrixAdcV1Node = {
	type: 'n8n-nodes-base.citrixAdc';
	version: 1;
	config: NodeConfig<CitrixAdcV1Params>;
	credentials?: CitrixAdcV1Credentials;
};

export type CitrixAdcNode = CitrixAdcV1Node;
