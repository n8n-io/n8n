/**
* @file metadata-sp.ts
* @author tngan
* @desc  Metadata of service provider
*/
import Metadata, { MetadataInterface } from './metadata';
import { MetadataSpConstructor } from './types';
export interface SpMetadataInterface extends MetadataInterface {
}
export default function (meta: MetadataSpConstructor): SpMetadata;
/**
* @desc SP Metadata is for creating Service Provider, provides a set of API to manage the actions in SP.
*/
export declare class SpMetadata extends Metadata {
    /**
    * @param  {object/string} meta (either xml string or configuration in object)
    * @return {object} prototypes including public functions
    */
    constructor(meta: MetadataSpConstructor);
    /**
    * @desc Get the preference whether it wants a signed assertion response
    * @return {boolean} Wantassertionssigned
    */
    isWantAssertionsSigned(): boolean;
    /**
    * @desc Get the preference whether it signs request
    * @return {boolean} Authnrequestssigned
    */
    isAuthnRequestSigned(): boolean;
    /**
    * @desc Get the entity endpoint for assertion consumer service
    * @param  {string} binding         protocol binding (e.g. redirect, post)
    * @return {string/[string]} URL of endpoint(s)
    */
    getAssertionConsumerService(binding: string): string | string[];
}
