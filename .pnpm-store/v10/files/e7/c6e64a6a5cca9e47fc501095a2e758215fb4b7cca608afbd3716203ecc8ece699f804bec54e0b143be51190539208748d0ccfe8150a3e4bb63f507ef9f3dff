/**
* @file entity-sp.ts
* @author tngan
* @desc  Declares the actions taken by service provider
*/
import Entity, {
  BindingContext,
  PostBindingContext,
  ESamlHttpRequest,
  SimpleSignBindingContext,
} from './entity';
import {
  IdentityProviderConstructor as IdentityProvider,
  ServiceProviderMetadata,
  ServiceProviderSettings,
} from './types';
import { namespace } from './urn';
import redirectBinding from './binding-redirect';
import postBinding from './binding-post';
import simpleSignBinding from './binding-simplesign';
import { flow, FlowResult } from './flow';

/*
 * @desc interface function
 */
export default function(props: ServiceProviderSettings) {
  return new ServiceProvider(props);
}

/**
* @desc Service provider can be configured using either metadata importing or spSetting
* @param  {object} spSettingimport { FlowResult } from '../types/src/flow.d';

*/
export class ServiceProvider extends Entity {
  entityMeta: ServiceProviderMetadata;

  /**
  * @desc  Inherited from Entity
  * @param {object} spSetting    setting of service provider
  */
  constructor(spSetting: ServiceProviderSettings) {
    const entitySetting = Object.assign({
      authnRequestsSigned: false,
      wantAssertionsSigned: false,
      wantMessageSigned: false,
    }, spSetting);
    super(entitySetting, 'sp');
  }

  /**
  * @desc  Generates the login request for developers to design their own method
  * @param  {IdentityProvider} idp               object of identity provider
  * @param  {string}   binding                   protocol binding
  * @param  {function} customTagReplacement     used when developers have their own login response template
  */
  public createLoginRequest(
    idp: IdentityProvider,
    binding = 'redirect',
    customTagReplacement?: (template: string) => BindingContext,
  ): BindingContext | PostBindingContext| SimpleSignBindingContext  {
    const nsBinding = namespace.binding;
    const protocol = nsBinding[binding];
    if (this.entityMeta.isAuthnRequestSigned() !== idp.entityMeta.isWantAuthnRequestsSigned()) {
      throw new Error('ERR_METADATA_CONFLICT_REQUEST_SIGNED_FLAG');
    }

    let context: any = null;
    switch (protocol) {
      case nsBinding.redirect:
        return redirectBinding.loginRequestRedirectURL({ idp, sp: this }, customTagReplacement);

      case nsBinding.post:
        context = postBinding.base64LoginRequest("/*[local-name(.)='AuthnRequest']", { idp, sp: this }, customTagReplacement);
        break;

      case nsBinding.simpleSign:
        // Object context = {id, context, signature, sigAlg}
        context = simpleSignBinding.base64LoginRequest( { idp, sp: this }, customTagReplacement);
        break;

      default:
        // Will support artifact in the next release
        throw new Error('ERR_SP_LOGIN_REQUEST_UNDEFINED_BINDING');
    } 

    return {
      ...context,
      relayState: this.entitySetting.relayState,
      entityEndpoint: idp.entityMeta.getSingleSignOnService(binding) as string,
      type: 'SAMLRequest',
    };
  }

  /**
  * @desc   Validation of the parsed the URL parameters
  * @param  {IdentityProvider}   idp             object of identity provider
  * @param  {string}   binding                   protocol binding
  * @param  {request}   req                      request
  */
  public parseLoginResponse(idp, binding, request: ESamlHttpRequest) {
    const self = this;
    return flow({
      from: idp,
      self: self,
      checkSignature: true, // saml response must have signature
      parserType: 'SAMLResponse',
      type: 'login',
      binding: binding,
      request: request
    });
  }

}
