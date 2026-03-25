/**
* @file entity-idp.ts
* @author tngan
* @desc  Declares the actions taken by identity provider
*/
import Entity, { ESamlHttpRequest } from './entity';
import {
  ServiceProviderConstructor as ServiceProvider,
  ServiceProviderMetadata,
  IdentityProviderMetadata,
  IdentityProviderSettings,
} from './types';
import libsaml from './libsaml';
import { namespace } from './urn';
import postBinding from './binding-post';
import redirectBinding from './binding-redirect';
import simpleSignBinding from './binding-simplesign';
import { flow, FlowResult } from './flow';
import { isString } from './utility';
import { BindingContext } from './entity';

/**
 * Identity provider can be configured using either metadata importing or idpSetting
 */
export default function(props: IdentityProviderSettings) {
  return new IdentityProvider(props);
}

/**
 * Identity provider can be configured using either metadata importing or idpSetting
 */
export class IdentityProvider extends Entity {

  entityMeta: IdentityProviderMetadata;

  constructor(idpSetting: IdentityProviderSettings) {
    const defaultIdpEntitySetting = {
      wantAuthnRequestsSigned: false,
      tagPrefix: {
        encryptedAssertion: 'saml',
      },
    };
    const entitySetting = Object.assign(defaultIdpEntitySetting, idpSetting);
    // build attribute part
    if (idpSetting.loginResponseTemplate) {
      if (isString(idpSetting.loginResponseTemplate.context) && Array.isArray(idpSetting.loginResponseTemplate.attributes)) {
        let attributeStatementTemplate;
        let attributeTemplate;
        if (!idpSetting.loginResponseTemplate.additionalTemplates || !idpSetting.loginResponseTemplate.additionalTemplates!.attributeStatementTemplate) {
          attributeStatementTemplate = libsaml.defaultAttributeStatementTemplate;
        } else {
          attributeStatementTemplate = idpSetting.loginResponseTemplate.additionalTemplates!.attributeStatementTemplate!;
        }
        if (!idpSetting.loginResponseTemplate.additionalTemplates || !idpSetting.loginResponseTemplate.additionalTemplates!.attributeTemplate) {
          attributeTemplate = libsaml.defaultAttributeTemplate;
        } else {
          attributeTemplate = idpSetting.loginResponseTemplate.additionalTemplates!.attributeTemplate!;
        }
        const replacement = {
          AttributeStatement: libsaml.attributeStatementBuilder(idpSetting.loginResponseTemplate.attributes, attributeTemplate, attributeStatementTemplate),
        };
        entitySetting.loginResponseTemplate = {
          ...entitySetting.loginResponseTemplate,
          context: libsaml.replaceTagsByValue(entitySetting.loginResponseTemplate!.context, replacement),
        };
      } else {
        console.warn('Invalid login response template');
      }
    }
    super(entitySetting, 'idp');
  }

  /**
  * @desc  Generates the login response for developers to design their own method
  * @param  sp                        object of service provider
  * @param  requestInfo               corresponding request, used to obtain the id
  * @param  binding                   protocol binding
  * @param  user                      current logged user (e.g. req.user)
  * @param  customTagReplacement      used when developers have their own login response template
  * @param  encryptThenSign           whether or not to encrypt then sign first (if signing)
  * @param  relayState             the relayState from corresponding request
  */
  public async createLoginResponse(
    sp: ServiceProvider,
    requestInfo: { [key: string]: any },
    binding: string,
    user: { [key: string]: any },
    customTagReplacement?: (template: string) => BindingContext,
    encryptThenSign?: boolean,
    relayState?: string,
  ) {
    const protocol = namespace.binding[binding];
    // can support post, redirect and post simple sign bindings for login response
    let context: any = null;
    switch (protocol) {
      case namespace.binding.post:
        context = await postBinding.base64LoginResponse(requestInfo, {
          idp: this,
          sp,
        }, user, customTagReplacement, encryptThenSign);
        break;

      case namespace.binding.simpleSign:
        context = await simpleSignBinding.base64LoginResponse( requestInfo, {
          idp: this, sp,
        }, user, relayState, customTagReplacement);
        break;

      case namespace.binding.redirect:
        return redirectBinding.loginResponseRedirectURL(requestInfo, {
          idp: this,
          sp,
        }, user, relayState, customTagReplacement);

      default:
        throw new Error('ERR_CREATE_RESPONSE_UNDEFINED_BINDING');
    }

    return {
      ...context,
      relayState,
      entityEndpoint: (sp.entityMeta as ServiceProviderMetadata).getAssertionConsumerService(binding) as string,
      type: 'SAMLResponse'
    };
  }

  /**
   * Validation of the parsed URL parameters
   * @param sp ServiceProvider instance
   * @param binding Protocol binding
   * @param req RequesmessageSigningOrderst
   */
  parseLoginRequest(sp: ServiceProvider, binding: string, req: ESamlHttpRequest) {
    const self = this;
    return flow({
      from: sp,
      self: self,
      checkSignature: self.entityMeta.isWantAuthnRequestsSigned(),
      parserType: 'SAMLRequest',
      type: 'login',
      binding: binding,
      request: req
    });
  }
}
