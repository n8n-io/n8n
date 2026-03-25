import { Metadata } from './metadata';
export interface CallMetadataOptions {
    method_name: string;
    service_url: string;
}
export type CallMetadataGenerator = (options: CallMetadataOptions, cb: (err: Error | null, metadata?: Metadata) => void) => void;
export interface OldOAuth2Client {
    getRequestMetadata: (url: string, callback: (err: Error | null, headers?: {
        [index: string]: string;
    }) => void) => void;
}
export interface CurrentOAuth2Client {
    getRequestHeaders: (url?: string) => Promise<{
        [index: string]: string;
    }>;
}
export type OAuth2Client = OldOAuth2Client | CurrentOAuth2Client;
/**
 * A class that represents a generic method of adding authentication-related
 * metadata on a per-request basis.
 */
export declare abstract class CallCredentials {
    /**
     * Asynchronously generates a new Metadata object.
     * @param options Options used in generating the Metadata object.
     */
    abstract generateMetadata(options: CallMetadataOptions): Promise<Metadata>;
    /**
     * Creates a new CallCredentials object from properties of both this and
     * another CallCredentials object. This object's metadata generator will be
     * called first.
     * @param callCredentials The other CallCredentials object.
     */
    abstract compose(callCredentials: CallCredentials): CallCredentials;
    /**
     * Check whether two call credentials objects are equal. Separate
     * SingleCallCredentials with identical metadata generator functions are
     * equal.
     * @param other The other CallCredentials object to compare with.
     */
    abstract _equals(other: CallCredentials): boolean;
    /**
     * Creates a new CallCredentials object from a given function that generates
     * Metadata objects.
     * @param metadataGenerator A function that accepts a set of options, and
     * generates a Metadata object based on these options, which is passed back
     * to the caller via a supplied (err, metadata) callback.
     */
    static createFromMetadataGenerator(metadataGenerator: CallMetadataGenerator): CallCredentials;
    /**
     * Create a gRPC credential from a Google credential object.
     * @param googleCredentials The authentication client to use.
     * @return The resulting CallCredentials object.
     */
    static createFromGoogleCredential(googleCredentials: OAuth2Client): CallCredentials;
    static createEmpty(): CallCredentials;
}
