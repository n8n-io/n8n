import { RegistryAuthLocator } from "./registry-auth-locator";
import { AuthConfig, ContainerRuntimeConfig } from "./types";
export declare class Auths implements RegistryAuthLocator {
    getName(): string;
    getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined>;
    private findAuthEntry;
}
