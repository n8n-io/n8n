/**
 * Crypto Node - Version 1
 * Provide cryptographic utilities
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CryptoV1Params {
	action?: 'generate' | 'hash' | 'hmac' | 'sign' | Expression<string>;
/**
 * The hash type to use
 * @displayOptions.show { action: ["hash"] }
 * @default MD5
 */
		type: 'MD5' | 'SHA256' | 'SHA3-256' | 'SHA3-384' | 'SHA3-512' | 'SHA384' | 'SHA512' | Expression<string>;
/**
 * Whether the data to hashed should be taken from binary field
 * @displayOptions.show { action: ["hash", "hmac"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * Name of the binary property which contains the input data
 * @displayOptions.show { action: ["hash", "hmac"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * The value that should be hashed
 * @displayOptions.show { action: ["hash"], binaryData: [false] }
 */
		value: string | Expression<string>;
/**
 * Name of the property to which to write the hash
 * @displayOptions.show { action: ["hash"] }
 * @default data
 */
		dataPropertyName: string | Expression<string>;
	encoding: 'base64' | 'hex' | Expression<string>;
	secret: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { action: ["sign"] }
 */
		algorithm: 'RSA-MD5' | 'RSA-RIPEMD160' | 'RSA-SHA1' | 'RSA-SHA1-2' | 'RSA-SHA224' | 'RSA-SHA256' | 'RSA-SHA3-224' | 'RSA-SHA3-256' | 'RSA-SHA3-384' | 'RSA-SHA3-512' | 'RSA-SHA384' | 'RSA-SHA512' | 'RSA-SHA512/224' | 'RSA-SHA512/256' | 'RSA-SM3' | 'blake2b512' | 'blake2s256' | 'id-rsassa-pkcs1-v1_5-with-sha3-224' | 'id-rsassa-pkcs1-v1_5-with-sha3-256' | 'id-rsassa-pkcs1-v1_5-with-sha3-384' | 'id-rsassa-pkcs1-v1_5-with-sha3-512' | 'md5' | 'md5-sha1' | 'md5WithRSAEncryption' | 'ripemd' | 'ripemd160' | 'ripemd160WithRSA' | 'rmd160' | 'sha1' | 'sha1WithRSAEncryption' | 'sha224' | 'sha224WithRSAEncryption' | 'sha256' | 'sha256WithRSAEncryption' | 'sha3-224' | 'sha3-256' | 'sha3-384' | 'sha3-512' | 'sha384' | 'sha384WithRSAEncryption' | 'sha512' | 'sha512-224' | 'sha512-224WithRSAEncryption' | 'sha512-256' | 'sha512-256WithRSAEncryption' | 'sha512WithRSAEncryption' | 'shake128' | 'shake256' | 'sm3' | 'sm3WithRSAEncryption' | 'ssl3-md5' | 'ssl3-sha1' | Expression<string>;
/**
 * Private key to use when signing the string
 * @displayOptions.show { action: ["sign"] }
 */
		privateKey: string | Expression<string>;
/**
 * Encoding that will be used to generate string
 * @displayOptions.show { action: ["generate"] }
 * @default uuid
 */
		encodingType: 'ascii' | 'base64' | 'hex' | 'uuid' | Expression<string>;
/**
 * Length of the generated string
 * @displayOptions.show { action: ["generate"], encodingType: ["ascii", "base64", "hex"] }
 * @default 32
 */
		stringLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface CryptoV1NodeBase {
	type: 'n8n-nodes-base.crypto';
	version: 1;
}

export type CryptoV1ParamsNode = CryptoV1NodeBase & {
	config: NodeConfig<CryptoV1Params>;
};

export type CryptoV1Node = CryptoV1ParamsNode;