/**
* @file binding-post.ts
* @author tngan
* @desc Binding-level API, declare the functions using POST binding
*/
import { BindingContext } from './entity';
/**
* @desc Generate a base64 encoded login request
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function base64LoginRequest(referenceTagXPath: string, entity: any, customTagReplacement?: (template: string) => BindingContext): BindingContext;
/**
* @desc Generate a base64 encoded login response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {function} customTagReplacement     used when developers have their own login response template
* @param  {boolean}  encryptThenSign           whether or not to encrypt then sign first (if signing). Defaults to sign-then-encrypt
*/
declare function base64LoginResponse(requestInfo: any | undefined, entity: any, user?: any, customTagReplacement?: (template: string) => BindingContext, encryptThenSign?: boolean): Promise<BindingContext>;
/**
* @desc Generate a base64 encoded logout request
* @param  {object} user                         current logged user (e.g. req.user)
* @param  {string} referenceTagXPath            reference uri
* @param  {object} entity                       object includes both idp and sp
* @param  {function} customTagReplacement      used when developers have their own login response template
* @return {string} base64 encoded request
*/
declare function base64LogoutRequest(user: any, referenceTagXPath: any, entity: any, customTagReplacement?: (template: string) => BindingContext): BindingContext;
/**
* @desc Generate a base64 encoded logout response
* @param  {object} requestInfo                 corresponding request, used to obtain the id
* @param  {string} referenceTagXPath           reference uri
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function base64LogoutResponse(requestInfo: any, entity: any, customTagReplacement: (template: string) => BindingContext): BindingContext;
declare const postBinding: {
    base64LoginRequest: typeof base64LoginRequest;
    base64LoginResponse: typeof base64LoginResponse;
    base64LogoutRequest: typeof base64LogoutRequest;
    base64LogoutResponse: typeof base64LogoutResponse;
};
export default postBinding;
