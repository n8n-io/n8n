import { IEncryptAsymmetricInput, IEncryptSymmetric128BitHexKeyUTF8Input, IEncryptSymmetricInput, IEncryptSymmetricOutput, IDecryptAsymmetricInput, IDecryptSymmetric128BitHexKeyUTF8Input, IDecryptSymmetricInput } from '../types/utils';
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
export declare const encryptAsymmetric: ({ plaintext, publicKey, privateKey }: IEncryptAsymmetricInput) => {
    ciphertext: string;
    nonce: string;
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
export declare const decryptAsymmetric: ({ ciphertext, nonce, publicKey, privateKey }: IDecryptAsymmetricInput) => Uint8Array | null;
/**
 * Return new base64-encoded, 256-bit symmetric key
 * @returns {String} key - new symmetric key
 */
export declare const createSymmetricKey: () => string;
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
export declare const encryptSymmetric: ({ plaintext, key }: IEncryptSymmetricInput) => IEncryptSymmetricOutput;
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
export declare const decryptSymmetric: ({ ciphertext, iv, tag, key }: IDecryptSymmetricInput) => string;
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
export declare const encryptSymmetric128BitHexKeyUTF8: ({ plaintext, key }: IEncryptSymmetric128BitHexKeyUTF8Input) => {
    ciphertext: string;
    iv: string;
    tag: string;
};
/**
 * Return symmetrically decrypted [ciphertext] using [iv], [tag],
 * and [key].
 *
 * NOTE: THIS FUNCTION SHOULD NOT BE USED FOR ALL FUTURE
 * DECRYPTION OPERATIONS UNLESS IT TOUCHES OLD FUNCTIONALITY
 * THAT USES IT. USE decryptSymmetric() instead
*/
export declare const decryptSymmetric128BitHexKeyUTF8: ({ ciphertext, iv, tag, key }: IDecryptSymmetric128BitHexKeyUTF8Input) => string;
