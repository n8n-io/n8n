/**
* @file binding-simplesign.ts
* @author Orange
* @desc Binding-level API, declare the functions using POST SimpleSign binding
*/
import { BindingContext, SimpleSignComputedContext } from './entity';
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
* @desc Generate a base64 encoded login request
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function base64LoginRequest(entity: any, customTagReplacement?: (template: string) => BindingContext): SimpleSignComputedContext;
/**
* @desc Generate a base64 encoded login response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {string}  relayState               the relay state
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function base64LoginResponse(requestInfo: any | undefined, entity: any, user?: any, relayState?: string, customTagReplacement?: (template: string) => BindingContext): Promise<BindingSimpleSignContext>;
declare const simpleSignBinding: {
    base64LoginRequest: typeof base64LoginRequest;
    base64LoginResponse: typeof base64LoginResponse;
};
export default simpleSignBinding;
