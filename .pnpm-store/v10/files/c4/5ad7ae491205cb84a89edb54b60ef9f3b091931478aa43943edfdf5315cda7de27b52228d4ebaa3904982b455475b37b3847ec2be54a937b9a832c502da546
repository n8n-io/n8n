/**
* @file metadata.ts
* @author tngan
* @desc An abstraction for metadata of identity provider and service provider
*/
import * as fs from 'fs';
import { namespace } from './urn';
import { extract } from './extractor';
import { isString } from './utility';

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
  constructor(xml: string | Buffer, extraParse: any = []) {
    this.xmlString = xml.toString();
    this.meta = extract(this.xmlString, extraParse.concat([
      {
        key: 'entityDescriptor',
        localPath: ['EntityDescriptor'],
        attributes: [],
        context: true
      },
      {
        key: 'entityID',
        localPath: ['EntityDescriptor'],
        attributes: ['entityID']
      },
      {
        // shared certificate for both encryption and signing
        key: 'sharedCertificate',
        localPath: ['EntityDescriptor', '~SSODescriptor', 'KeyDescriptor', 'KeyInfo', 'X509Data', 'X509Certificate'],
        attributes: []
      },
      {
        // explicit certificate declaration for encryption and signing
        key: 'certificate',
        localPath: ['EntityDescriptor', '~SSODescriptor', 'KeyDescriptor'],
        index: ['use'],
        attributePath: ['KeyInfo', 'X509Data', 'X509Certificate'],
        attributes: []
      },
      {
        key: 'singleLogoutService',
        localPath: ['EntityDescriptor', '~SSODescriptor', 'SingleLogoutService'],
        attributes: ['Binding', 'Location']
      },
      {
        key: 'nameIDFormat',
        localPath: ['EntityDescriptor', '~SSODescriptor', 'NameIDFormat'],
        attributes: [],
      }
    ]));

    // get shared certificate
    const sharedCertificate = this.meta.sharedCertificate;
    if (typeof sharedCertificate === 'string') {
      this.meta.certificate = {
        signing: sharedCertificate,
        encryption: sharedCertificate
      };
      delete this.meta.sharedCertificate;
    }

    if (
      Array.isArray(this.meta.entityDescriptor) &&
      this.meta.entityDescriptor.length > 1
    ) {
      throw new Error('ERR_MULTIPLE_METADATA_ENTITYDESCRIPTOR');
    }

  }

  /**
  * @desc Get the metadata in xml format
  * @return {string} metadata in xml format
  */
  public getMetadata(): string {
    return this.xmlString;
  }

  /**
  * @desc Export the metadata to specific file
  * @param {string} exportFile is the output file path
  */
  public exportMetadata(exportFile: string): void {
    fs.writeFileSync(exportFile, this.xmlString);
  }

  /**
  * @desc Get the entityID in metadata
  * @return {string} entityID
  */
  public getEntityID(): string {
    return this.meta.entityID;
  }

  /**
  * @desc Get the x509 certificate declared in entity metadata
  * @param  {string} use declares the type of certificate
  * @return {string} certificate in string format
  */
  public getX509Certificate(use: string) {
    return this.meta.certificate[use] || null;
  }

  /**
  * @desc Get the support NameID format declared in entity metadata
  * @return {array} support NameID format
  */
  public getNameIDFormat(): any {
    return this.meta.nameIDFormat;
  }

  /**
  * @desc Get the entity endpoint for single logout service
  * @param  {string} binding e.g. redirect, post
  * @return {string/object} location
  */
  public getSingleLogoutService(binding: string | undefined): string | object {
    if (binding && isString(binding)) {
      const bindType = namespace.binding[binding];
      let singleLogoutService = this.meta.singleLogoutService;
      if (!(singleLogoutService instanceof Array)) {
        singleLogoutService = [singleLogoutService];
       }
      const service = singleLogoutService.find(obj => obj.binding === bindType);
      if (service) {
        return service.location;
      }
    }
    return this.meta.singleLogoutService;
  }

  /**
  * @desc Get the support bindings
  * @param  {[string]} services
  * @return {[string]} support bindings
  */
  public getSupportBindings(services: string[]): string[] {
    let supportBindings = [];
    if (services) {
      supportBindings = services.reduce((acc: any, service) => {
        const supportBinding = Object.keys(service)[0];
        return acc.push(supportBinding);
      }, []);
    }
    return supportBindings;
  }
}
