export interface MetadataInterface {
    xmlString: string;
    getMetadata: () => string;
    exportMetadata: (exportFile: string) => void;
    getEntityID: () => string;
    getX509Certificate: (certType: string) => string | string[];
    getNameIDFormat: () => any[];
    getSingleLogoutService: (binding: string | undefined) => string | object;
    getSupportBindings: (services: string[]) => string[];
}
export default class Metadata implements MetadataInterface {
    xmlString: string;
    meta: any;
    /**
    * @param  {string | Buffer} xml
    * @param  {object} extraParse for custom metadata extractor
    */
    constructor(xml: string | Buffer, extraParse?: any);
    /**
    * @desc Get the metadata in xml format
    * @return {string} metadata in xml format
    */
    getMetadata(): string;
    /**
    * @desc Export the metadata to specific file
    * @param {string} exportFile is the output file path
    */
    exportMetadata(exportFile: string): void;
    /**
    * @desc Get the entityID in metadata
    * @return {string} entityID
    */
    getEntityID(): string;
    /**
    * @desc Get the x509 certificate declared in entity metadata
    * @param  {string} use declares the type of certificate
    * @return {string} certificate in string format
    */
    getX509Certificate(use: string): any;
    /**
    * @desc Get the support NameID format declared in entity metadata
    * @return {array} support NameID format
    */
    getNameIDFormat(): any;
    /**
    * @desc Get the entity endpoint for single logout service
    * @param  {string} binding e.g. redirect, post
    * @return {string/object} location
    */
    getSingleLogoutService(binding: string | undefined): string | object;
    /**
    * @desc Get the support bindings
    * @param  {[string]} services
    * @return {[string]} support bindings
    */
    getSupportBindings(services: string[]): string[];
}
