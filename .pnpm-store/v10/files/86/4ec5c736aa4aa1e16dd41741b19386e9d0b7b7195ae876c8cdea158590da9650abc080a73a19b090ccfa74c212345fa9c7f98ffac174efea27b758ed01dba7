/**
* @file binding-simplesign.ts
* @author Orange
* @desc Binding-level API, declare the functions using POST SimpleSign binding
*/

import { wording, StatusCode } from './urn';
import { BindingContext, SimpleSignComputedContext } from './entity';
import libsaml from './libsaml';
import utility, { get } from './utility';

const binding = wording.binding;
const urlParams = wording.urlParams;

export interface BuildSimpleSignConfig {
  type: string;
  context: string;
  entitySetting: any;
  relayState?: string;
}

export interface BindingSimpleSignContext {
  id: string;
  context: string;
  signature: any;
  sigAlg: string;
}

/**
* @private
* @desc Helper of generating URL param/value pair
* @param  {string} param     key
* @param  {string} value     value of key
* @param  {boolean} first    determine whether the param is the starting one in order to add query header '?'
* @return {string}
*/
function pvPair(param: string, value: string, first?: boolean): string {
  return (first === true ? '?' : '&') + param + '=' + value;
}
/**
* @private
* @desc Refactored part of simple signature generation for login/logout request
* @param  {string} type
* @param  {string} rawSamlRequest
* @param  {object} entitySetting
* @return {string}
*/
function buildSimpleSignature(opts: BuildSimpleSignConfig) : string {
  const {
    type,
    context,
    entitySetting,
  } = opts;
  let { relayState = '' } = opts;
  const queryParam = libsaml.getQueryParamByType(type);

  if (relayState !== '') {
    relayState = pvPair(urlParams.relayState, relayState);
  }

  const sigAlg = pvPair(urlParams.sigAlg, entitySetting.requestSignatureAlgorithm);
  const octetString = context + relayState + sigAlg;
  return libsaml.constructMessageSignature(
    queryParam + '=' + octetString,
    entitySetting.privateKey,
    entitySetting.privateKeyPass,
    undefined,
    entitySetting.requestSignatureAlgorithm
  ).toString();
}

/**
* @desc Generate a base64 encoded login request
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
function base64LoginRequest(entity: any, customTagReplacement?: (template: string) => BindingContext): SimpleSignComputedContext {
  const metadata = { idp: entity.idp.entityMeta, sp: entity.sp.entityMeta };
  const spSetting = entity.sp.entitySetting;
  let id: string = '';

  if (metadata && metadata.idp && metadata.sp) {
    const base = metadata.idp.getSingleSignOnService(binding.simpleSign);
    let rawSamlRequest: string;
    if (spSetting.loginRequestTemplate && customTagReplacement) {
      const info = customTagReplacement(spSetting.loginRequestTemplate.context);
      id = get(info, 'id', null);
      rawSamlRequest = get(info, 'context', null);
    } else {
      const nameIDFormat = spSetting.nameIDFormat;
      const selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
      id = spSetting.generateID();
      rawSamlRequest = libsaml.replaceTagsByValue(libsaml.defaultLoginRequestTemplate.context, {
        ID: id,
        Destination: base,
        Issuer: metadata.sp.getEntityID(),
        IssueInstant: new Date().toISOString(),
        AssertionConsumerServiceURL: metadata.sp.getAssertionConsumerService(binding.simpleSign),
        EntityID: metadata.sp.getEntityID(),
        AllowCreate: spSetting.allowCreate,
        NameIDFormat: selectedNameIDFormat
      } as any);
    }

    let simpleSignatureContext : any = null;
    if (metadata.idp.isWantAuthnRequestsSigned()) {
        const simpleSignature = buildSimpleSignature({
            type: urlParams.samlRequest,
            context: rawSamlRequest,
            entitySetting: spSetting,
            relayState: spSetting.relayState,
        });

        simpleSignatureContext = {
          signature: simpleSignature,
          sigAlg: spSetting.requestSignatureAlgorithm,
        };
    }
    // No need to embeded XML signature
    return {
      id,
      context: utility.base64Encode(rawSamlRequest),
      ...simpleSignatureContext,
    };
  }
  throw new Error('ERR_GENERATE_POST_SIMPLESIGN_LOGIN_REQUEST_MISSING_METADATA');
}
/**
* @desc Generate a base64 encoded login response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {string}  relayState               the relay state
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
async function base64LoginResponse(requestInfo: any = {}, entity: any, user: any = {}, relayState?: string, customTagReplacement?: (template: string) => BindingContext): Promise<BindingSimpleSignContext> {
  const idpSetting = entity.idp.entitySetting;
  const spSetting = entity.sp.entitySetting;
  const id = idpSetting.generateID();
  const metadata = {
    idp: entity.idp.entityMeta,
    sp: entity.sp.entityMeta,
  };
  const nameIDFormat = idpSetting.nameIDFormat;
  const selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat;
  if (metadata && metadata.idp && metadata.sp) {
    const base = metadata.sp.getAssertionConsumerService(binding.simpleSign);
    let rawSamlResponse: string;
    const nowTime = new Date();
    // Five minutes later : nowtime  + 5 * 60 * 1000 (in milliseconds)
    const fiveMinutesLaterTime = new Date(nowTime.getTime() + 300_000 );
    const tvalue: any = {
      ID: id,
      AssertionID: idpSetting.generateID(),
      Destination: base,
      Audience: metadata.sp.getEntityID(),
      EntityID: metadata.sp.getEntityID(),
      SubjectRecipient: base,
      Issuer: metadata.idp.getEntityID(),
      IssueInstant: nowTime.toISOString(),
      AssertionConsumerServiceURL: base,
      StatusCode: StatusCode.Success,
      // can be customized
      ConditionsNotBefore: nowTime.toISOString(),
      ConditionsNotOnOrAfter: fiveMinutesLaterTime.toISOString(),
      SubjectConfirmationDataNotOnOrAfter: fiveMinutesLaterTime.toISOString(),
      NameIDFormat: selectedNameIDFormat,
      NameID: user.email || '',
      InResponseTo: get(requestInfo, 'extract.request.id', ''),
      AuthnStatement: '',
      AttributeStatement: '',
    };
    if (idpSetting.loginResponseTemplate && customTagReplacement) {
      const template = customTagReplacement(idpSetting.loginResponseTemplate.context);
      rawSamlResponse = get(template, 'context', null);
    } else {
      if (requestInfo !== null) {
        tvalue.InResponseTo = requestInfo.extract.request.id;
      }
      rawSamlResponse = libsaml.replaceTagsByValue(libsaml.defaultLoginResponseTemplate.context, tvalue);
    }
    const { privateKey, privateKeyPass, requestSignatureAlgorithm: signatureAlgorithm } = idpSetting;
    const config = {
      privateKey,
      privateKeyPass,
      signatureAlgorithm,
      signingCert: metadata.idp.getX509Certificate('signing'),
      isBase64Output: false,
    };
    // step: sign assertion ? -> encrypted ? -> sign message ?
    if (metadata.sp.isWantAssertionsSigned()) {
      rawSamlResponse = libsaml.constructSAMLSignature({
        ...config,
        rawSamlMessage: rawSamlResponse,
        transformationAlgorithms: spSetting.transformationAlgorithms,
        referenceTagXPath: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']",
        signatureConfig: {
          prefix: 'ds',
          location: { reference: "/*[local-name(.)='Response']/*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: 'after' },
        },
      });
    }

    // SAML response must be signed sign message first, then encrypt
    let simpleSignature: string = '';
    // like in post and redirect bindings, login response is always signed.
    simpleSignature = buildSimpleSignature({
        type: urlParams.samlResponse,
        context: rawSamlResponse,
        entitySetting: idpSetting,
        relayState: relayState,
    } );

    return Promise.resolve({
      id,
      context: utility.base64Encode(rawSamlResponse),
      signature: simpleSignature,
      sigAlg: idpSetting.requestSignatureAlgorithm,
    });

  }
  throw new Error('ERR_GENERATE_POST_SIMPLESIGN_LOGIN_RESPONSE_MISSING_METADATA');
}

const simpleSignBinding = {
    base64LoginRequest,
    base64LoginResponse,
  };

export default simpleSignBinding;
