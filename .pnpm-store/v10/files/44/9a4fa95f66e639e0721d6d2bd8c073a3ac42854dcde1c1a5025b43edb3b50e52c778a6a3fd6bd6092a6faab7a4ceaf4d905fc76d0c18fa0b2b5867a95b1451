/**
 * Credentials object.
 */
interface Credentials {
    privateKey: string;
    clientEmail?: string;
}
/**
 * Given a keyFile, extract the key and client email if available
 * @param keyFile Path to a json, pem, or p12 file that contains the key.
 * @returns an object with privateKey and clientEmail properties
 */
declare function getCredentials(keyFilePath: string): Promise<Credentials>;
export { getCredentials, Credentials };
