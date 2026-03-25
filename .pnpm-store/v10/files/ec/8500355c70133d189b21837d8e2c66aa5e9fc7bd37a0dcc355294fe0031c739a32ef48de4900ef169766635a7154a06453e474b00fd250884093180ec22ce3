import { AuthConfig, ContainerRuntimeConfig } from "./types";
export interface RegistryAuthLocator {
    getName(): string;
    getAuthConfig(registry: string, dockerConfig: ContainerRuntimeConfig): Promise<AuthConfig | undefined>;
}
