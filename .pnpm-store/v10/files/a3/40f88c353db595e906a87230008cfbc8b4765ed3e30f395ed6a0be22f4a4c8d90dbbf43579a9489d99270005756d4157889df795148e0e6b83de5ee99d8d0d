import * as crypto from 'crypto';
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { 
    IEncryptAsymmetricInput, 
    IEncryptSymmetric128BitHexKeyUTF8Input,
    IEncryptSymmetricInput,
    IEncryptSymmetricOutput,
    IDecryptAsymmetricInput, 
    IDecryptSymmetric128BitHexKeyUTF8Input,
    IDecryptSymmetricInput
} from '../types/utils';
import {
    IV_BYTES_SIZE,
    SYMMETRIC_KEY_BYTES_SIZE,
    ALGORITHM_AES_256_GCM,
    ENCODING_SCHEME_BASE64,
    ENCODING_SCHEME_HEX,
    ENCODING_SCHEME_UTF8
} from '../variables';

/**
 * Return assymmetrically encrypted [plaintext] using [publicKey] where
 * [publicKey] likely belongs to the recipient.
 * @param {Object} obj
 * @param {String} obj.plaintext - plaintext to encrypt
 * @param {String} obj.publicKey - public key of the recipient
 * @param {String} obj.privateKey - private key of the sender (current user)
 * @returns {Object} obj
 * @returns {String} ciphertext - base64-encoded ciphertext
 * @returns {String} nonce - base64-encoded nonce
 */
export const encryptAsymmetric = ({ plaintext, publicKey, privateKey }: IEncryptAsymmetricInput) => {
	const nonce = nacl.randomBytes(24);
    const ciphertext = nacl.box(
        util.decodeUTF8(plaintext),
        nonce,
        util.decodeBase64(publicKey),
        util.decodeBase64(privateKey)
    );

	return {
		ciphertext: util.encodeBase64(ciphertext),
		nonce: util.encodeBase64(nonce)
	};
};

/**
 * Return assymmetrically decrypted [ciphertext] using [privateKey] where
 * [privateKey] likely belongs to the recipient.
 * @param {Object} obj
 * @param {String} obj.ciphertext - ciphertext to decrypt
 * @param {String} obj.nonce - nonce
 * @param {String} obj.publicKey - public key of the sender
 * @param {String} obj.privateKey - private key of the receiver (current user)
 * @param {String} plaintext - UTF8 plaintext
 */
export const decryptAsymmetric = ({ ciphertext, nonce, publicKey, privateKey }: IDecryptAsymmetricInput) => nacl.box.open(
        util.decodeBase64(ciphertext),
        util.decodeBase64(nonce),
        util.decodeBase64(publicKey),
        util.decodeBase64(privateKey)
);

/**
 * Return new base64-encoded, 256-bit symmetric key 
 * @returns {String} key - new symmetric key
 */
export const createSymmetricKey = (): string => 
    crypto.randomBytes(SYMMETRIC_KEY_BYTES_SIZE).toString('base64');

/**
 * Return symmetrically encrypted [plaintext] using [key].
 * @param {Object} obj
 * @param {String} obj.plaintext - (utf8) plaintext to encrypt
 * @param {String} obj.key - (base64) 256-bit key
 * @returns {Object} obj
 * @returns {String} obj.ciphertext (base64) ciphertext
 * @returns {String} obj.iv (base64) iv
 * @returns {String} obj.tag (base64) tag
 */
export const encryptSymmetric = ({
	plaintext,
	key
}: IEncryptSymmetricInput): IEncryptSymmetricOutput => {
    
    const iv = crypto.randomBytes(IV_BYTES_SIZE);

    const secretKey = crypto.createSecretKey(key, 'base64');
    const cipher = crypto.createCipheriv(ALGORITHM_AES_256_GCM, secretKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

	return {
		ciphertext,
		iv: iv.toString('base64'),
		tag: cipher.getAuthTag().toString('base64')
	};
};

/**
 * Return symmetrically decrypted [ciphertext] using [iv], [tag],
 * and [key].
 * @param {Object} obj
 * @param {String} obj.ciphertext - ciphertext to decrypt
 * @param {String} obj.iv - (base64) 256-bit iv
 * @param {String} obj.tag - (base64) tag
 * @param {String} obj.key - (base64) 256-bit key
 * @returns {String} cleartext - (utf8) the deciphered ciphertext
 */
export const decryptSymmetric = ({
	ciphertext,
	iv,
	tag,
	key
}: IDecryptSymmetricInput): string => {

    const secretKey = crypto.createSecretKey(key, 'base64');

    const decipher = crypto.createDecipheriv(
        ALGORITHM_AES_256_GCM,
        secretKey,
        Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    let cleartext = decipher.update(ciphertext, 'base64', 'utf8');
    cleartext += decipher.final('utf8');

    return cleartext;
};

/**
 * Return symmetrically encrypted [plaintext] using [key].
 * 
 * NOTE: THIS FUNCTION SHOULD NOT BE USED FOR ALL FUTURE
 * ENCRYPTION OPERATIONS UNLESS IT TOUCHES OLD FUNCTIONALITY
 * THAT USES IT.
 * 
 * @param {Object} obj
 * @param {String} obj.plaintext - (utf8) plaintext to encrypt
 * @param {String} obj.key - (hex) 128-bit key
 * @returns {Object} obj
 * @returns {String} obj.ciphertext (base64) ciphertext
 * @returns {String} obj.iv (base64) iv
 * @returns {String} obj.tag (base64) tag
 */
export const encryptSymmetric128BitHexKeyUTF8 = ({ plaintext, key }: IEncryptSymmetric128BitHexKeyUTF8Input) => {
    const ALGORITHM = 'aes-256-gcm';
    const BLOCK_SIZE_BYTES = 16;

    const iv = crypto.randomBytes(BLOCK_SIZE_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    return {
        ciphertext,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
    };
} 

/**
 * Return symmetrically decrypted [ciphertext] using [iv], [tag],
 * and [key].
 * 
 * NOTE: THIS FUNCTION SHOULD NOT BE USED FOR ALL FUTURE
 * DECRYPTION OPERATIONS UNLESS IT TOUCHES OLD FUNCTIONALITY
 * THAT USES IT. USE decryptSymmetric() instead
*/
export const decryptSymmetric128BitHexKeyUTF8 = ({ ciphertext, iv, tag, key }: IDecryptSymmetric128BitHexKeyUTF8Input) => {
    const ALGORITHM = 'aes-256-gcm';
    
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    let cleartext = decipher.update(ciphertext, 'base64', 'utf8');
    cleartext += decipher.final('utf8');

    return cleartext;
}