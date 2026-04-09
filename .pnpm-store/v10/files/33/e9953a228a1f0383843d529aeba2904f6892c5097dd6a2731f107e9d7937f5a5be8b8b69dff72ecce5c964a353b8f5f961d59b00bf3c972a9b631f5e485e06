/* eslint-disable @typescript-eslint/no-unused-vars, class-methods-use-this */
/**
 * Base Authenticator class for other Authenticators to extend. Not intended
 * to be used as a stand-alone authenticator.
 */
export class Authenticator {
    /**
     * Create a new Authenticator instance.
     *
     * @throws Error: the "new" keyword was not used to construct the authenticator.
     */
    constructor() {
        if (!(this instanceof Authenticator)) {
            throw new Error('the "new" keyword is required to create authenticator instances');
        }
    }
    /**
     * Augment the request with authentication information.
     *
     * @param requestOptions - The request to augment with authentication information.
     * @throws Error: The authenticate method was not implemented by a subclass.
     */
    authenticate(requestOptions) {
        const error = new Error('Should be implemented by subclass!');
        return Promise.reject(error);
    }
    /**
     * Retrieves the authenticator's type.
     * The returned value will be the same string that is used
     * when configuring an instance of the authenticator with the
     * \<service_name\>_AUTH_TYPE configuration property
     * (e.g. "basic", "iam", etc.).
     * This function should be overridden in each authenticator
     * implementation class that extends this class.
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType() {
        return Authenticator.AUTHTYPE_UNKNOWN;
    }
}
/**
 * Constants that define the various authenticator types.
 */
Authenticator.AUTHTYPE_BASIC = 'basic';
Authenticator.AUTHTYPE_BEARERTOKEN = 'bearerToken';
Authenticator.AUTHTYPE_IAM = 'iam';
Authenticator.AUTHTYPE_IAM_ASSUME = 'iamAssume';
Authenticator.AUTHTYPE_CONTAINER = 'container';
Authenticator.AUTHTYPE_CP4D = 'cp4d';
Authenticator.AUTHTYPE_NOAUTH = 'noAuth';
Authenticator.AUTHTYPE_VPC = 'vpc';
Authenticator.AUTHTYPE_MCSP = 'mcsp';
Authenticator.AUTHTYPE_MCSPV2 = 'mcspv2';
Authenticator.AUTHTYPE_UNKNOWN = 'unknown';
