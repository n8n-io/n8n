import { BedrockAgentRuntimeExtensionConfiguration } from "./extensionConfiguration";
export interface RuntimeExtension {
  configure(
    extensionConfiguration: BedrockAgentRuntimeExtensionConfiguration
  ): void;
}
export interface RuntimeExtensionsConfig {
  extensions: RuntimeExtension[];
}
export declare const resolveRuntimeExtensions: (
  runtimeConfig: any,
  extensions: RuntimeExtension[]
) => any;
