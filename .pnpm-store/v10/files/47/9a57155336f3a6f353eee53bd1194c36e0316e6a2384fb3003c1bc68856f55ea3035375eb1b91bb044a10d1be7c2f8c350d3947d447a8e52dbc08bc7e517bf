import { BindingContext } from './entity';
import { IdentityProvider as Idp } from './entity-idp';
import { ServiceProvider as Sp } from './entity-sp';
export interface BuildRedirectConfig {
    baseUrl: string;
    type: string;
    isSigned: boolean;
    context: string;
    entitySetting: any;
    relayState?: string;
}
/**
* @desc Redirect URL for login request
* @param  {object} entity                       object includes both idp and sp
* @param  {function} customTagReplacement      used when developers have their own login response template
* @return {string} redirect URL
*/
declare function loginRequestRedirectURL(entity: {
    idp: Idp;
    sp: Sp;
}, customTagReplacement?: (template: string) => BindingContext): BindingContext;
/**
* @desc Redirect URL for login response
* @param  {object} requestInfo             corresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {object} user                         current logged user (e.g. req.user)
* @param  {String} relayState                the relaystate sent by sp corresponding request
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function loginResponseRedirectURL(requestInfo: any, entity: any, user?: any, relayState?: string, customTagReplacement?: (template: string) => BindingContext): BindingContext;
/**
* @desc Redirect URL for logout request
* @param  {object} user                        current logged user (e.g. req.user)
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
* @return {string} redirect URL
*/
declare function logoutRequestRedirectURL(user: any, entity: any, relayState?: string, customTagReplacement?: (template: string, tags: object) => BindingContext): BindingContext;
/**
* @desc Redirect URL for logout response
* @param  {object} requescorresponding request, used to obtain the id
* @param  {object} entity                      object includes both idp and sp
* @param  {function} customTagReplacement     used when developers have their own login response template
*/
declare function logoutResponseRedirectURL(requestInfo: any, entity: any, relayState?: string, customTagReplacement?: (template: string) => BindingContext): BindingContext;
declare const redirectBinding: {
    loginRequestRedirectURL: typeof loginRequestRedirectURL;
    loginResponseRedirectURL: typeof loginResponseRedirectURL;
    logoutRequestRedirectURL: typeof logoutRequestRedirectURL;
    logoutResponseRedirectURL: typeof logoutResponseRedirectURL;
};
export default redirectBinding;
