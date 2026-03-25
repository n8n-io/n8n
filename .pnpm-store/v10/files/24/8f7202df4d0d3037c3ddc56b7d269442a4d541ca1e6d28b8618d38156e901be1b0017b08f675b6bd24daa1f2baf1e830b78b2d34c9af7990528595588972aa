/**
* @file metadata-sp.ts
* @author tngan
* @desc  Metadata of service provider
*/
import Metadata, { MetadataInterface } from './metadata';
import { MetadataSpConstructor, MetadataSpOptions } from './types';
import { namespace, elementsOrder as order } from './urn';
import libsaml from './libsaml';
import { castArrayOpt, isNonEmptyArray, isString } from './utility';
import xml from 'xml';

export interface SpMetadataInterface extends MetadataInterface {

}

// https://docs.oasis-open.org/security/saml/v2.0/saml-metadata-2.0-os.pdf (P.16, 18)
interface MetaElement {
  KeyDescriptor?: any[];
  NameIDFormat?: any[];
  SingleLogoutService?: any[];
  AssertionConsumerService?: any[];
  AttributeConsumingService?: any[];
}

/*
 * @desc interface function
 */
export default function(meta: MetadataSpConstructor) {
  return new SpMetadata(meta);
}

/**
* @desc SP Metadata is for creating Service Provider, provides a set of API to manage the actions in SP.
*/
export class SpMetadata extends Metadata {

  /**
  * @param  {object/string} meta (either xml string or configuration in object)
  * @return {object} prototypes including public functions
  */
  constructor(meta: MetadataSpConstructor) {

    const isFile = isString(meta) || meta instanceof Buffer;

    // use object configuration instead of importing metadata file directly
    if (!isFile) {

      const {
        elementsOrder = order.default,
        entityID,
        signingCert,
        encryptCert,
        authnRequestsSigned = false,
        wantAssertionsSigned = false,
        wantMessageSigned = false,
        signatureConfig,
        nameIDFormat = [],
        singleLogoutService = [],
        assertionConsumerService = [],
      } = meta as MetadataSpOptions;

      const descriptors: MetaElement = {
        KeyDescriptor: [],
        NameIDFormat: [],
        SingleLogoutService: [],
        AssertionConsumerService: [],
        AttributeConsumingService: [],
      };

      const SPSSODescriptor: any[] = [{
        _attr: {
          AuthnRequestsSigned: String(authnRequestsSigned),
          WantAssertionsSigned: String(wantAssertionsSigned),
          protocolSupportEnumeration: namespace.names.protocol,
        },
      }];

      if (wantMessageSigned && signatureConfig === undefined) {
        console.warn('Construct service provider - missing signatureConfig');
      }

      for(const cert of castArrayOpt(signingCert)) {
        descriptors.KeyDescriptor!.push(libsaml.createKeySection('signing', cert).KeyDescriptor);
      }

      for(const cert of castArrayOpt(encryptCert)) {
        descriptors.KeyDescriptor!.push(libsaml.createKeySection('encryption', cert).KeyDescriptor);
      }

      if (isNonEmptyArray(nameIDFormat)) {
        nameIDFormat.forEach(f => descriptors.NameIDFormat!.push(f));
      } else {
        // default value
        descriptors.NameIDFormat!.push(namespace.format.emailAddress);
      }

      if (isNonEmptyArray(singleLogoutService)) {
        singleLogoutService.forEach(a => {
          const attr: any = {
            Binding: a.Binding,
            Location: a.Location,
          };
          if (a.isDefault) {
            attr.isDefault = true;
          }
          descriptors.SingleLogoutService!.push([{ _attr: attr }]);
        });
      }

      if (isNonEmptyArray(assertionConsumerService)) {
        let indexCount = 0;
        assertionConsumerService.forEach(a => {
          const attr: any = {
            index: String(indexCount++),
            Binding: a.Binding,
            Location: a.Location,
          };
          if (a.isDefault) {
            attr.isDefault = true;
          }
          descriptors.AssertionConsumerService!.push([{ _attr: attr }]);
        });
      } else {
        // console.warn('Missing endpoint of AssertionConsumerService');
      }

      // handle element order
      const existedElements = elementsOrder.filter(name => isNonEmptyArray(descriptors[name]));
      existedElements.forEach(name => {
        descriptors[name].forEach(e => SPSSODescriptor.push({ [name]: e }));
      });

      // Re-assign the meta reference as a XML string|Buffer for use with the parent constructor
      meta = xml([{
        EntityDescriptor: [{
          _attr: {
            entityID,
            'xmlns': namespace.names.metadata,
            'xmlns:assertion': namespace.names.assertion,
            'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
          },
        }, { SPSSODescriptor }],
      }]);

    }

    // Use the re-assigned meta object reference here
    super(meta as string | Buffer, [
      {
        key: 'spSSODescriptor',
        localPath: ['EntityDescriptor', 'SPSSODescriptor'],
        attributes: ['WantAssertionsSigned', 'AuthnRequestsSigned'],
      },
      {
        key: 'assertionConsumerService',
        localPath: ['EntityDescriptor', 'SPSSODescriptor', 'AssertionConsumerService'],
        attributes: ['Binding', 'Location', 'isDefault', 'index'],
      }
    ]);

  }

  /**
  * @desc Get the preference whether it wants a signed assertion response
  * @return {boolean} Wantassertionssigned
  */
  public isWantAssertionsSigned(): boolean {
    return this.meta.spSSODescriptor.wantAssertionsSigned === 'true';
  }
  /**
  * @desc Get the preference whether it signs request
  * @return {boolean} Authnrequestssigned
  */
  public isAuthnRequestSigned(): boolean {
    return this.meta.spSSODescriptor.authnRequestsSigned === 'true';
  }
  /**
  * @desc Get the entity endpoint for assertion consumer service
  * @param  {string} binding         protocol binding (e.g. redirect, post)
  * @return {string/[string]} URL of endpoint(s)
  */
  public getAssertionConsumerService(binding: string): string | string[] {
    if (isString(binding)) {
      let location;
      const bindName = namespace.binding[binding];
      if (isNonEmptyArray(this.meta.assertionConsumerService)) {
        this.meta.assertionConsumerService.forEach(obj => {
          if (obj.binding === bindName) {
            location = obj.location;
            return;
          }
        });
      } else {
        if (this.meta.assertionConsumerService.binding === bindName) {
          location = this.meta.assertionConsumerService.location;
        }
      }
      return location;
    }
    return this.meta.assertionConsumerService;
  }
}
