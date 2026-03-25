import { inflateString, base64Decode } from './utility';
import { verifyTime } from './validator';
import libsaml from './libsaml';
import {
  extract,
  loginRequestFields,
  loginResponseFields,
  logoutRequestFields,
  logoutResponseFields,
  ExtractorFields,
  logoutResponseStatusFields,
  loginResponseStatusFields
} from './extractor';

import {
  BindingNamespace,
  ParserType,
  wording,
  MessageSignatureOrder,
  StatusCode
} from './urn';

const bindDict = wording.binding;
const urlParams = wording.urlParams;

export interface FlowResult {
  samlContent: string;
  extract: any;
  sigAlg?: string|null ;
}

// get the default extractor fields based on the parserType
function getDefaultExtractorFields(parserType: ParserType, assertion?: any): ExtractorFields {
  switch (parserType) {
    case ParserType.SAMLRequest:
      return loginRequestFields;
    case ParserType.SAMLResponse:
      if (!assertion) {
        // unexpected hit
        throw new Error('ERR_EMPTY_ASSERTION');
      }
      return loginResponseFields(assertion);
    case ParserType.LogoutRequest:
      return logoutRequestFields;
    case ParserType.LogoutResponse:
      return logoutResponseFields;
    default:
      throw new Error('ERR_UNDEFINED_PARSERTYPE');
  }
}

// proceed the redirect binding flow
async function redirectFlow(options): Promise<FlowResult>  {

  const { request, parserType, self, checkSignature = true, from } = options;
  const { query, octetString } = request;
  const { SigAlg: sigAlg, Signature: signature } = query;

  const targetEntityMetadata = from.entityMeta;

  // ?SAMLRequest= or ?SAMLResponse=
  const direction = libsaml.getQueryParamByType(parserType);
  const content = query[direction];

  // query must contain the saml content
  if (content === undefined) {
    return Promise.reject('ERR_REDIRECT_FLOW_BAD_ARGS');
  }

  const xmlString = inflateString(decodeURIComponent(content));

  // validate the xml
  try {
    await libsaml.isValidXml(xmlString);
  } catch (e) {
    return Promise.reject('ERR_INVALID_XML');
  }

  // check status based on different scenarios
  await checkStatus(xmlString, parserType);

  let assertion: string = '';

  if (parserType === urlParams.samlResponse){
    // Extract assertion shortcut
    const verifiedDoc = extract(xmlString, [{
      key: 'assertion',
      localPath: ['~Response', 'Assertion'],
      attributes: [],
      context: true
    }]);
    if (verifiedDoc && verifiedDoc.assertion){
      assertion = verifiedDoc.assertion as string;
    }
  }

  const extractorFields = getDefaultExtractorFields(parserType, assertion.length > 0 ? assertion : null);

  const parseResult: { samlContent: string, extract: any, sigAlg: (string | null) } = {
    samlContent: xmlString,
    sigAlg: null,
    extract: extract(xmlString, extractorFields),
  };

  // see if signature check is required
  // only verify message signature is enough
  if (checkSignature) {
    if (!signature || !sigAlg) {
      return Promise.reject('ERR_MISSING_SIG_ALG');
    }

    // put the below two assignments into verifyMessageSignature function
    const base64Signature = Buffer.from(decodeURIComponent(signature), 'base64');
    const decodeSigAlg = decodeURIComponent(sigAlg);

    const verified = libsaml.verifyMessageSignature(targetEntityMetadata, octetString, base64Signature, sigAlg);

    if (!verified) {
      // Fail to verify message signature
      return Promise.reject('ERR_FAILED_MESSAGE_SIGNATURE_VERIFICATION');
    }

    parseResult.sigAlg = decodeSigAlg;
  }

  /**
   *  Validation part: validate the context of response after signature is verified and decrypted (optional)
   */
  const issuer = targetEntityMetadata.getEntityID();
  const extractedProperties = parseResult.extract;

  // unmatched issuer
  if (
    (parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
    && extractedProperties
    && extractedProperties.issuer !== issuer
  ) {
    return Promise.reject('ERR_UNMATCH_ISSUER');
  }

  // invalid session time
  // only run the verifyTime when `SessionNotOnOrAfter` exists
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.sessionIndex.sessionNotOnOrAfter
    && !verifyTime(
      undefined,
      extractedProperties.sessionIndex.sessionNotOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_EXPIRED_SESSION');
  }

  // invalid time
  // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.conditions
    && !verifyTime(
      extractedProperties.conditions.notBefore,
      extractedProperties.conditions.notOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_SUBJECT_UNCONFIRMED');
  }

  return Promise.resolve(parseResult);
}

// proceed the post flow
async function postFlow(options): Promise<FlowResult> {

  const {
    request,
    from,
    self,
    parserType,
    checkSignature = true
  } = options;

  const { body } = request;

  const direction = libsaml.getQueryParamByType(parserType);
  const encodedRequest = body[direction];

  let samlContent = String(base64Decode(encodedRequest));

  const verificationOptions = {
    metadata: from.entityMeta,
    signatureAlgorithm: from.entitySetting.requestSignatureAlgorithm,
  };

  const decryptRequired = from.entitySetting.isAssertionEncrypted;

  let extractorFields: ExtractorFields = [];

  // validate the xml first
  await libsaml.isValidXml(samlContent);

  if (parserType !== urlParams.samlResponse) {
    extractorFields = getDefaultExtractorFields(parserType, null);
  }

  // check status based on different scenarios
  await checkStatus(samlContent, parserType);

  // verify the signatures (the response is encrypted then signed, then verify first then decrypt)
  if (
    checkSignature &&
    from.entitySetting.messageSigningOrder === MessageSignatureOrder.ETS
  ) {
    const [verified, verifiedAssertionNode] = libsaml.verifySignature(samlContent, verificationOptions);
    if (!verified) {
      return Promise.reject('ERR_FAIL_TO_VERIFY_ETS_SIGNATURE');
    }
    if (!decryptRequired) {
      extractorFields = getDefaultExtractorFields(parserType, verifiedAssertionNode);
    }
  }

  if (parserType === 'SAMLResponse' && decryptRequired) {
    const result = await libsaml.decryptAssertion(self, samlContent);
    samlContent = result[0];
    extractorFields = getDefaultExtractorFields(parserType, result[1]);
  }

  // verify the signatures (the response is signed then encrypted, then decrypt first then verify)
  if (
    checkSignature &&
    from.entitySetting.messageSigningOrder === MessageSignatureOrder.STE
  ) {
    const [verified, verifiedAssertionNode] = libsaml.verifySignature(samlContent, verificationOptions);
    if (verified) {
      extractorFields = getDefaultExtractorFields(parserType, verifiedAssertionNode);
    } else {
      return Promise.reject('ERR_FAIL_TO_VERIFY_STE_SIGNATURE');
    }
  }

  const parseResult = {
    samlContent: samlContent,
    extract: extract(samlContent, extractorFields),
  };

  /**
   *  Validation part: validate the context of response after signature is verified and decrypted (optional)
   */
  const targetEntityMetadata = from.entityMeta;
  const issuer = targetEntityMetadata.getEntityID();
  const extractedProperties = parseResult.extract;

  // unmatched issuer
  if (
    (parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
    && extractedProperties
    && extractedProperties.issuer !== issuer
  ) {
    return Promise.reject('ERR_UNMATCH_ISSUER');
  }

  // invalid session time
  // only run the verifyTime when `SessionNotOnOrAfter` exists
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.sessionIndex.sessionNotOnOrAfter
    && !verifyTime(
      undefined,
      extractedProperties.sessionIndex.sessionNotOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_EXPIRED_SESSION');
  }

  // invalid time
  // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.conditions
    && !verifyTime(
      extractedProperties.conditions.notBefore,
      extractedProperties.conditions.notOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_SUBJECT_UNCONFIRMED');
  }

  return Promise.resolve(parseResult);
}


// proceed the post simple sign binding flow
async function postSimpleSignFlow(options): Promise<FlowResult> {

  const { request, parserType, self, checkSignature = true, from } = options;

  const { body, octetString } = request;

  const targetEntityMetadata = from.entityMeta;

  // ?SAMLRequest= or ?SAMLResponse=
  const direction = libsaml.getQueryParamByType(parserType);
  const encodedRequest: string = body[direction];
  const sigAlg: string = body['SigAlg'];
  const signature: string = body['Signature'];

  // query must contain the saml content
  if (encodedRequest === undefined) {
    return Promise.reject('ERR_SIMPLESIGN_FLOW_BAD_ARGS');
  }

  const xmlString = String(base64Decode(encodedRequest));

  // validate the xml
  try {
    await libsaml.isValidXml(xmlString);
  } catch (e) {
    return Promise.reject('ERR_INVALID_XML');
  }

  // check status based on different scenarios
  await checkStatus(xmlString, parserType);

  let assertion: string = '';

  if (parserType === urlParams.samlResponse){
    // Extract assertion shortcut
    const verifiedDoc = extract(xmlString, [{
      key: 'assertion',
      localPath: ['~Response', 'Assertion'],
      attributes: [],
      context: true
    }]);
    if (verifiedDoc && verifiedDoc.assertion){
      assertion = verifiedDoc.assertion as string;
    }
  }

  const extractorFields = getDefaultExtractorFields(parserType, assertion.length > 0 ? assertion : null);

  const parseResult: { samlContent: string, extract: any, sigAlg: (string | null) } = {
    samlContent: xmlString,
    sigAlg: null,
    extract: extract(xmlString, extractorFields),
  };

  // see if signature check is required
  // only verify message signature is enough
  if (checkSignature) {
    if (!signature || !sigAlg) {
      return Promise.reject('ERR_MISSING_SIG_ALG');
    }

    // put the below two assignments into verifyMessageSignature function
    const base64Signature = Buffer.from(signature, 'base64');

    const verified = libsaml.verifyMessageSignature(targetEntityMetadata, octetString, base64Signature, sigAlg);

    if (!verified) {
      // Fail to verify message signature
      return Promise.reject('ERR_FAILED_MESSAGE_SIGNATURE_VERIFICATION');
    }

    parseResult.sigAlg = sigAlg;
  }

  /**
   *  Validation part: validate the context of response after signature is verified and decrypted (optional)
   */
  const issuer = targetEntityMetadata.getEntityID();
  const extractedProperties = parseResult.extract;

  // unmatched issuer
  if (
    (parserType === 'LogoutResponse' || parserType === 'SAMLResponse')
    && extractedProperties
    && extractedProperties.issuer !== issuer
  ) {
    return Promise.reject('ERR_UNMATCH_ISSUER');
  }

  // invalid session time
  // only run the verifyTime when `SessionNotOnOrAfter` exists
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.sessionIndex.sessionNotOnOrAfter
    && !verifyTime(
      undefined,
      extractedProperties.sessionIndex.sessionNotOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_EXPIRED_SESSION');
  }

  // invalid time
  // 2.4.1.2 https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf
  if (
    parserType === 'SAMLResponse'
    && extractedProperties.conditions
    && !verifyTime(
      extractedProperties.conditions.notBefore,
      extractedProperties.conditions.notOnOrAfter,
      self.entitySetting.clockDrifts
    )
  ) {
    return Promise.reject('ERR_SUBJECT_UNCONFIRMED');
  }

  return Promise.resolve(parseResult);
}


function checkStatus(content: string, parserType: string): Promise<string> {

  // only check response parser
  if (parserType !== urlParams.samlResponse && parserType !== urlParams.logoutResponse) {
    return Promise.resolve('SKIPPED');
  }

  const fields = parserType === urlParams.samlResponse
    ? loginResponseStatusFields
    : logoutResponseStatusFields;

  const {top, second} = extract(content, fields);

  // only resolve when top-tier status code is success
  if (top === StatusCode.Success) {
    return Promise.resolve('OK');
  }

  if (!top) {
    throw new Error('ERR_UNDEFINED_STATUS');
  }

  // returns a detailed error for two-tier error code
  throw new Error(`ERR_FAILED_STATUS with top tier code: ${top}, second tier code: ${second}`);
}

export function flow(options): Promise<FlowResult> {

  const binding = options.binding;
  const parserType = options.parserType;

  options.supportBindings = [BindingNamespace.Redirect, BindingNamespace.Post, BindingNamespace.SimpleSign];
  // saml response  allows POST, REDIRECT
  if (parserType === ParserType.SAMLResponse) {
    options.supportBindings = [BindingNamespace.Post, BindingNamespace.Redirect, BindingNamespace.SimpleSign];
  }

  if (binding === bindDict.post) {
    return postFlow(options);
  }

  if (binding === bindDict.redirect) {
    return redirectFlow(options);
  }

  if (binding === bindDict.simpleSign) {
    return postSimpleSignFlow(options);
  }

  return Promise.reject('ERR_UNEXPECTED_FLOW');

}
