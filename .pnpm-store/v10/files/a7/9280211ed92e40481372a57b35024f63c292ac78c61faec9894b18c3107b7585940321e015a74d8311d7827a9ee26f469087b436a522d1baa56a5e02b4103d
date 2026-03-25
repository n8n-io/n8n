/**
* @file metadata-idp.ts
* @author tngan
* @desc  Metadata of identity provider
*/
import Metadata, { MetadataInterface } from './metadata';
import { MetadataIdpConstructor } from './types';
export interface IdpMetadataInterface extends MetadataInterface {
}
export default function (meta: MetadataIdpConstructor): IdpMetadata;
export declare class IdpMetadata extends Metadata {
    constructor(meta: MetadataIdpConstructor);
    /**
    * @desc Get the preference whether it wants a signed request
    * @return {boolean} WantAuthnRequestsSigned
    */
    isWantAuthnRequestsSigned(): boolean;
    /**
    * @desc Get the entity endpoint for single sign on service
    * @param  {string} binding      protocol binding (e.g. redirect, post)
    * @return {string/object} location
    */
    getSingleSignOnService(binding: string): string | object;
}
