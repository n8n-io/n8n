export type ClientAssertionConfig = {
    clientId: string;
    tokenEndpoint?: string;
};
export type ClientAssertionCallback = (config: ClientAssertionConfig) => Promise<string>;
/**
 * Client Assertion credential for Confidential Clients
 */
export type ClientAssertion = {
    assertion: string | ClientAssertionCallback;
    assertionType: string;
};
/**
 * Client Credentials set for Confidential Clients
 */
export type ClientCredentials = {
    clientSecret?: string;
    clientAssertion?: ClientAssertion;
};
//# sourceMappingURL=ClientCredentials.d.ts.map