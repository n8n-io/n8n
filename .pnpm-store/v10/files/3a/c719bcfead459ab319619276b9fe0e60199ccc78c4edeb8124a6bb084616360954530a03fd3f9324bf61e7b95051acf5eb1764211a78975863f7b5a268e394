import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig, ContainerRuntimeConfig } from "./types";
export declare abstract class CredentialProvider implements RegistryAuthLocator {
    abstract getName(): string;
    abstract getCredentialProviderName(registry: string, dockerConfig: ContainerRuntimeConfig): string | undefined;
    getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined>;
    private runCredentialProvider;
    private parseUsernamePasswordConfig;
    private parseIdentityTokenConfig;
}
