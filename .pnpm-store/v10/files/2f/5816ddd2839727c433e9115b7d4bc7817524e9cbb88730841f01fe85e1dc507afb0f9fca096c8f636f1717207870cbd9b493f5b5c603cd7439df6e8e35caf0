export type CredentialProviderGetResponse = {
    ServerURL?: string;
    Username: string;
    Secret: string;
};
export type Auth = {
    auth?: string;
    email?: string;
    username?: string;
    password?: string;
    identitytoken?: string;
};
export type AuthConfig = UsernamePasswordAuthConfig | IdentityTokenAuthConfig;
export type UsernamePasswordAuthConfig = {
    registryAddress: string;
    username: string;
    password: string;
    email?: string;
};
export type IdentityTokenAuthConfig = {
    registryAddress: string;
    identityToken: string;
};
export type ContainerRuntimeConfig = {
    credHelpers?: {
        [registry: string]: string;
    };
    credsStore?: string;
    auths?: {
        [registry: string]: Auth;
    };
};
