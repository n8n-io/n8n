import type { BinaryToTextEncoding, CipherGCMTypes } from 'crypto';
import {
	constants,
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	createSign,
	getHashes,
	privateDecrypt,
	publicEncrypt,
	randomBytes,
	scrypt,
} from 'crypto';
import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy, BINARY_ENCODING, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { pipeline } from 'stream/promises';
import { v4 as uuid } from 'uuid';

import { formatPrivateKey } from '../../../utils/utilities';

const unsupportedAlgorithms = [
	'RSA-MD4',
	'RSA-MDC2',
	'md4',
	'md4WithRSAEncryption',
	'mdc2',
	'mdc2WithRSA',
];

const supportedAlgorithms = getHashes()
	.filter((algorithm) => !unsupportedAlgorithms.includes(algorithm))
	.map((algorithm) => ({ name: algorithm, value: algorithm }));

type SymmetricCipher = 'aes-128-gcm' | 'aes-192-gcm' | 'aes-256-gcm' | 'chacha20-poly1305';

const CIPHER_KEY_LENGTHS: Record<SymmetricCipher, number> = {
	'aes-128-gcm': 16,
	'aes-192-gcm': 24,
	'aes-256-gcm': 32,
	'chacha20-poly1305': 32,
};

const SYMMETRIC_SALT_LENGTH = 16;
const SYMMETRIC_IV_LENGTH = 12;
const SYMMETRIC_AUTH_TAG_LENGTH = 16;
// Payload layout v1: [version=0x01][salt:16][iv:12][tag:16][ciphertext]
// Bump the version if the layout, KDF, or cipher framing ever changes.
const SYMMETRIC_FORMAT_VERSION = 0x01;
// N=65536 balances brute-force resistance against per-call memory pressure on small deployments.
// maxmem must be raised explicitly because 128*N*r (~64MB) exceeds Node's default 32MB cap.
const SYMMETRIC_SCRYPT_OPTIONS = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 } as const;

async function deriveKey(passphrase: string, salt: Buffer, keylen: number): Promise<Buffer> {
	return await new Promise((resolve, reject) => {
		scrypt(passphrase, salt, keylen, SYMMETRIC_SCRYPT_OPTIONS, (error, key) => {
			if (error) reject(error);
			else resolve(key);
		});
	});
}

const versionDescription: INodeTypeDescription = {
	displayName: 'Crypto',
	name: 'crypto',
	icon: 'fa:key',
	iconColor: 'green',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["action"]}}',
	description: 'Provide cryptographic utilities',
	defaults: {
		name: 'Crypto',
		color: '#408000',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
			name: 'crypto',
			required: true,
			displayOptions: {
				show: {
					action: ['hmac', 'sign', 'encrypt', 'decrypt'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Action',
			name: 'action',
			type: 'options',
			options: [
				{
					name: 'Decrypt',
					description: 'Decrypt a string with a passphrase or private key',
					value: 'decrypt',
					action: 'Decrypt a string',
				},
				{
					name: 'Encrypt',
					description: 'Encrypt a string with a passphrase or public key',
					value: 'encrypt',
					action: 'Encrypt a string',
				},
				{
					name: 'Generate',
					description: 'Generate random string',
					value: 'generate',
					action: 'Generate random string',
				},
				{
					name: 'Hash',
					description: 'Hash a text or file in a specified format',
					value: 'hash',
					action: 'Hash a text or file in a specified format',
				},
				{
					name: 'Hmac',
					description: 'Hmac a text or file in a specified format',
					value: 'hmac',
					action: 'HMAC a text or file in a specified format',
				},
				{
					name: 'Sign',
					description: 'Sign a string using a private key',
					value: 'sign',
					action: 'Sign a string using a private key',
				},
			],
			default: 'hash',
		},
		{
			displayName: 'Binary File',
			name: 'binaryData',
			type: 'boolean',
			default: false,
			required: true,
			displayOptions: {
				show: {
					action: ['hash', 'hmac'],
				},
			},
			description: 'Whether the data to hashed should be taken from binary field',
		},
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			displayOptions: {
				show: {
					action: ['hash', 'hmac'],
					binaryData: [true],
				},
			},
			type: 'string',
			default: 'data',
			description: 'Name of the binary property which contains the input data',
			required: true,
		},
		{
			displayName: 'Type',
			name: 'type',
			displayOptions: {
				show: {
					action: ['hash'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'MD5',
					value: 'MD5',
				},
				{
					name: 'SHA256',
					value: 'SHA256',
				},
				{
					name: 'SHA3-256',
					value: 'SHA3-256',
				},
				{
					name: 'SHA3-384',
					value: 'SHA3-384',
				},
				{
					name: 'SHA3-512',
					value: 'SHA3-512',
				},
				{
					name: 'SHA384',
					value: 'SHA384',
				},
				{
					name: 'SHA512',
					value: 'SHA512',
				},
			],
			default: 'SHA256',
			description: 'The hash type to use',
			required: true,
		},
		{
			displayName: 'Value',
			name: 'value',
			displayOptions: {
				show: {
					action: ['hash'],
					binaryData: [false],
				},
			},
			type: 'string',
			default: '',
			description: 'The value that should be hashed',
			required: true,
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['hash'],
				},
			},
			description: 'Name of the property to which to write the hash',
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			displayOptions: {
				show: {
					action: ['hash'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'BASE64',
					value: 'base64',
				},
				{
					name: 'HEX',
					value: 'hex',
				},
			],
			default: 'hex',
			required: true,
		},
		{
			displayName: 'Type',
			name: 'type',
			displayOptions: {
				show: {
					action: ['hmac'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'MD5',
					value: 'MD5',
				},
				{
					name: 'SHA256',
					value: 'SHA256',
				},
				{
					name: 'SHA3-256',
					value: 'SHA3-256',
				},
				{
					name: 'SHA3-384',
					value: 'SHA3-384',
				},
				{
					name: 'SHA3-512',
					value: 'SHA3-512',
				},
				{
					name: 'SHA384',
					value: 'SHA384',
				},
				{
					name: 'SHA512',
					value: 'SHA512',
				},
			],
			default: 'SHA256',
			description: 'The hash type to use',
			required: true,
		},
		{
			displayName: 'Value',
			name: 'value',
			displayOptions: {
				show: {
					action: ['hmac'],
					binaryData: [false],
				},
			},
			type: 'string',
			default: '',
			description: 'The value of which the hmac should be created',
			required: true,
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['hmac'],
				},
			},
			description: 'Name of the property to which to write the hmac',
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			displayOptions: {
				show: {
					action: ['hmac'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'BASE64',
					value: 'base64',
				},
				{
					name: 'HEX',
					value: 'hex',
				},
			],
			default: 'hex',
			required: true,
		},
		{
			displayName: 'Value',
			name: 'value',
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			type: 'string',
			default: '',
			description: 'The value that should be signed',
			required: true,
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			description: 'Name of the property to which to write the signed value',
		},
		{
			displayName: 'Algorithm Name or ID',
			name: 'algorithm',
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			options: supportedAlgorithms,
			default: '',
			required: true,
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'BASE64',
					value: 'base64',
				},
				{
					name: 'HEX',
					value: 'hex',
				},
			],
			default: 'hex',
			required: true,
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					action: ['generate'],
				},
			},
			description: 'Name of the property to which to write the random string',
		},
		{
			displayName: 'Type',
			name: 'encodingType',
			displayOptions: {
				show: {
					action: ['generate'],
				},
			},
			type: 'options',
			options: [
				{
					name: 'ASCII',
					value: 'ascii',
				},
				{
					name: 'BASE64',
					value: 'base64',
				},
				{
					name: 'HEX',
					value: 'hex',
				},
				{
					name: 'UUID',
					value: 'uuid',
				},
			],
			default: 'uuid',
			description: 'Encoding that will be used to generate string',
			required: true,
		},
		{
			displayName: 'Length',
			name: 'stringLength',
			type: 'number',
			default: 32,
			description: 'Length of the generated string',
			displayOptions: {
				show: {
					action: ['generate'],
					encodingType: ['ascii', 'base64', 'hex'],
				},
			},
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			options: [
				{
					name: 'Symmetric (Passphrase)',
					value: 'symmetric',
					description: 'Encrypt or decrypt with a passphrase using an authenticated cipher',
				},
				{
					name: 'Asymmetric (RSA)',
					value: 'asymmetric',
					description: 'Encrypt with an RSA public key, decrypt with an RSA private key',
				},
			],
			default: 'symmetric',
			displayOptions: {
				show: {
					action: ['encrypt', 'decrypt'],
				},
			},
			required: true,
		},
		{
			displayName: 'Cipher',
			name: 'cipher',
			type: 'options',
			options: [
				{ name: 'AES-256-GCM', value: 'aes-256-gcm' },
				{ name: 'AES-192-GCM', value: 'aes-192-gcm' },
				{ name: 'AES-128-GCM', value: 'aes-128-gcm' },
				{ name: 'ChaCha20-Poly1305', value: 'chacha20-poly1305' },
			],
			default: 'aes-256-gcm',
			description:
				'Authenticated cipher to use. The same value must be selected on encrypt and decrypt.',
			displayOptions: {
				show: {
					action: ['encrypt', 'decrypt'],
					mode: ['symmetric'],
				},
			},
			required: true,
		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
			description:
				'For Encrypt: the plaintext to encrypt. For Decrypt: the base64 ciphertext produced by this node.',
			displayOptions: {
				show: {
					action: ['encrypt', 'decrypt'],
				},
			},
			required: true,
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			description: 'Name of the property to which to write the result',
			displayOptions: {
				show: {
					action: ['encrypt', 'decrypt'],
				},
			},
			required: true,
		},
	],
};

export class CryptoV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		let hmacSecret = '';
		let signPrivateKey = '';
		let encryptionPassphrase = '';
		let encryptionPublicKey = '';
		let encryptionPrivateKey = '';

		if (action === 'hmac' || action === 'sign' || action === 'encrypt' || action === 'decrypt') {
			const credentials = await this.getCredentials<{
				hmacSecret?: string;
				signPrivateKey?: string;
				encryptionPassphrase?: string;
				encryptionPublicKey?: string;
				encryptionPrivateKey?: string;
			}>('crypto');

			if (action === 'hmac') {
				if (!credentials.hmacSecret) {
					throw new NodeOperationError(
						this.getNode(),
						'No HMAC secret set in credentials. Please add an HMAC secret to your Crypto credentials.',
					);
				}
				hmacSecret = credentials.hmacSecret;
			}

			if (action === 'sign') {
				if (!credentials.signPrivateKey) {
					throw new NodeOperationError(
						this.getNode(),
						'No private key set in credentials. Please add a private key to your Crypto credentials.',
					);
				}
				signPrivateKey = formatPrivateKey(credentials.signPrivateKey);
			}

			if (action === 'encrypt' || action === 'decrypt') {
				const mode = this.getNodeParameter('mode', 0) as string;

				if (mode === 'symmetric') {
					if (!credentials.encryptionPassphrase) {
						throw new NodeOperationError(
							this.getNode(),
							'No encryption passphrase set in credentials. Please add an Encryption Passphrase to your Crypto credentials.',
						);
					}
					encryptionPassphrase = credentials.encryptionPassphrase;
				}

				if (mode === 'asymmetric' && action === 'encrypt') {
					if (!credentials.encryptionPublicKey) {
						throw new NodeOperationError(
							this.getNode(),
							'No encryption public key set in credentials. Please add an Encryption Public Key to your Crypto credentials.',
						);
					}
					encryptionPublicKey = formatPrivateKey(credentials.encryptionPublicKey, true);
				}

				if (mode === 'asymmetric' && action === 'decrypt') {
					if (!credentials.encryptionPrivateKey) {
						throw new NodeOperationError(
							this.getNode(),
							'No encryption private key set in credentials. Please add an Encryption Private Key to your Crypto credentials.',
						);
					}
					encryptionPrivateKey = formatPrivateKey(credentials.encryptionPrivateKey);
				}
			}
		}

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i);
				const value = this.getNodeParameter('value', i, '') as string;
				let newValue;
				let binaryProcessed = false;

				if (action === 'generate') {
					const encodingType = this.getNodeParameter('encodingType', i);
					if (encodingType === 'uuid') {
						newValue = uuid();
					} else {
						const stringLength = this.getNodeParameter('stringLength', i) as number;
						if (encodingType === 'base64') {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.replace(/\W/g, '')
								.slice(0, stringLength);
						} else {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.slice(0, stringLength);
						}
					}
				}

				if (action === 'hash' || action === 'hmac') {
					const type = this.getNodeParameter('type', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const hashOrHmac = action === 'hash' ? createHash(type) : createHmac(type, hmacSecret);
					if (this.getNodeParameter('binaryData', i)) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						if (binaryData.id) {
							const binaryStream = await this.helpers.getBinaryStream(binaryData.id);
							hashOrHmac.setEncoding(encoding);
							await pipeline(binaryStream, hashOrHmac);
							newValue = hashOrHmac.read();
						} else {
							newValue = hashOrHmac
								.update(Buffer.from(binaryData.data, BINARY_ENCODING))
								.digest(encoding);
						}
						binaryProcessed = true;
					} else {
						newValue = hashOrHmac.update(value).digest(encoding);
					}
				}

				if (action === 'sign') {
					const algorithm = this.getNodeParameter('algorithm', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const sign = createSign(algorithm);
					sign.write(value);
					sign.end();
					newValue = sign.sign(signPrivateKey, encoding);
				}

				if (action === 'encrypt') {
					const mode = this.getNodeParameter('mode', i) as string;

					if (mode === 'symmetric') {
						const cipher = this.getNodeParameter('cipher', i) as SymmetricCipher;
						const keyLength = CIPHER_KEY_LENGTHS[cipher];
						const salt = randomBytes(SYMMETRIC_SALT_LENGTH);
						const iv = randomBytes(SYMMETRIC_IV_LENGTH);
						const key = await deriveKey(encryptionPassphrase, salt, keyLength);
						// Cast: Node's typings only model AEAD methods for CipherGCMTypes,
						// but chacha20-poly1305 has the same getAuthTag/setAuthTag runtime API.
						const cipherInstance = createCipheriv(cipher as CipherGCMTypes, key, iv);
						const ciphertext = Buffer.concat([
							cipherInstance.update(value, 'utf8'),
							cipherInstance.final(),
						]);
						const authTag = cipherInstance.getAuthTag();
						newValue = Buffer.concat([
							Buffer.from([SYMMETRIC_FORMAT_VERSION]),
							salt,
							iv,
							authTag,
							ciphertext,
						]).toString('base64');
					} else {
						try {
							const encrypted = publicEncrypt(
								{
									key: encryptionPublicKey,
									padding: constants.RSA_PKCS1_OAEP_PADDING,
									oaepHash: 'sha256',
								},
								Buffer.from(value, 'utf8'),
							);
							newValue = encrypted.toString('base64');
						} catch (error) {
							const opensslError = error as { code?: string; message?: string };
							if (
								opensslError.code === 'ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE' ||
								/data too large/i.test(opensslError.message ?? '')
							) {
								throw new NodeOperationError(
									this.getNode(),
									'Plaintext is too large for the RSA key. Use symmetric mode for larger data.',
									{ itemIndex: i },
								);
							}
							throw error;
						}
					}
				}

				if (action === 'decrypt') {
					const mode = this.getNodeParameter('mode', i) as string;

					try {
						if (mode === 'symmetric') {
							const cipher = this.getNodeParameter('cipher', i) as SymmetricCipher;
							const keyLength = CIPHER_KEY_LENGTHS[cipher];
							const payload = Buffer.from(value, 'base64');
							const headerLength =
								1 + SYMMETRIC_SALT_LENGTH + SYMMETRIC_IV_LENGTH + SYMMETRIC_AUTH_TAG_LENGTH;
							if (payload.length < headerLength) {
								throw new NodeOperationError(
									this.getNode(),
									'Ciphertext is malformed or truncated',
									{ itemIndex: i },
								);
							}
							const version = payload[0];
							if (version !== SYMMETRIC_FORMAT_VERSION) {
								throw new NodeOperationError(
									this.getNode(),
									`Unsupported ciphertext version 0x${version.toString(16).padStart(2, '0')}`,
									{ itemIndex: i },
								);
							}
							const ivStart = 1 + SYMMETRIC_SALT_LENGTH;
							const tagStart = ivStart + SYMMETRIC_IV_LENGTH;
							const ctStart = tagStart + SYMMETRIC_AUTH_TAG_LENGTH;
							const salt = payload.subarray(1, ivStart);
							const iv = payload.subarray(ivStart, tagStart);
							const authTag = payload.subarray(tagStart, ctStart);
							const ciphertext = payload.subarray(ctStart);
							const key = await deriveKey(encryptionPassphrase, salt, keyLength);
							const decipher = createDecipheriv(cipher as CipherGCMTypes, key, iv);
							decipher.setAuthTag(authTag);
							const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
							newValue = plaintext.toString('utf8');
						} else {
							const decrypted = privateDecrypt(
								{
									key: encryptionPrivateKey,
									padding: constants.RSA_PKCS1_OAEP_PADDING,
									oaepHash: 'sha256',
								},
								Buffer.from(value, 'base64'),
							);
							newValue = decrypted.toString('utf8');
						}
					} catch (error) {
						if (error instanceof NodeOperationError) throw error;
						throw new NodeOperationError(
							this.getNode(),
							'Decryption failed: wrong passphrase, key, cipher, or corrupted payload',
							{ itemIndex: i },
						);
					}
				}

				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: deepCopy(item.json),
						pairedItem: {
							item: i,
						},
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
						pairedItem: {
							item: i,
						},
					};
				}

				if (item.binary !== undefined && !binaryProcessed) {
					newItem.binary = item.binary;
				}

				set(newItem, ['json', dataPropertyName], newValue);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					const errorDetails = error as Error & { code?: string };
					const errorData: JsonObject = {
						message: errorDetails.message,
					};
					if (errorDetails.name) {
						errorData.name = errorDetails.name;
					}
					if (errorDetails.code) {
						errorData.code = errorDetails.code;
					}
					returnData.push({
						json: {
							error: errorData,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
