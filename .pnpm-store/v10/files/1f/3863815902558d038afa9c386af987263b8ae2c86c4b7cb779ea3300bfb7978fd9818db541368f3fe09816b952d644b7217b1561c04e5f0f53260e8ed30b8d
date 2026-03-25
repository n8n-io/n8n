import { SignatureV4 } from "@smithy/signature-v4";
import { SESSION_TOKEN_HEADER, SESSION_TOKEN_QUERY_PARAM } from "../constants";
export class SignatureV4S3Express extends SignatureV4 {
    async signWithCredentials(requestToSign, credentials, options) {
        const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
        requestToSign.headers[SESSION_TOKEN_HEADER] = credentials.sessionToken;
        const privateAccess = this;
        setSingleOverride(privateAccess, credentialsWithoutSessionToken);
        return privateAccess.signRequest(requestToSign, options ?? {});
    }
    async presignWithCredentials(requestToSign, credentials, options) {
        const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
        delete requestToSign.headers[SESSION_TOKEN_HEADER];
        requestToSign.headers[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
        requestToSign.query = requestToSign.query ?? {};
        requestToSign.query[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
        const privateAccess = this;
        setSingleOverride(privateAccess, credentialsWithoutSessionToken);
        return this.presign(requestToSign, options);
    }
}
function getCredentialsWithoutSessionToken(credentials) {
    const credentialsWithoutSessionToken = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        expiration: credentials.expiration,
    };
    return credentialsWithoutSessionToken;
}
function setSingleOverride(privateAccess, credentialsWithoutSessionToken) {
    const id = setTimeout(() => {
        throw new Error("SignatureV4S3Express credential override was created but not called.");
    }, 10);
    const currentCredentialProvider = privateAccess.credentialProvider;
    const overrideCredentialsProviderOnce = () => {
        clearTimeout(id);
        privateAccess.credentialProvider = currentCredentialProvider;
        return Promise.resolve(credentialsWithoutSessionToken);
    };
    privateAccess.credentialProvider = overrideCredentialsProviderOnce;
}
