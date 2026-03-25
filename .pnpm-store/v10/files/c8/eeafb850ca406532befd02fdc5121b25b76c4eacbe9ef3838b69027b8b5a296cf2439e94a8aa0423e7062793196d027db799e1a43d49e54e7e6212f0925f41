import { ToolingConfiguration } from '@microsoft/agents-a365-tooling';
import { LangChainToolingConfigurationOptions } from './LangChainToolingConfigurationOptions';
/**
 * Configuration for LangChain tooling extension package.
 * Inherits all tooling and runtime settings.
 *
 * ## Why This Class Exists
 *
 * Although this class currently adds no new settings beyond what ToolingConfiguration
 * provides, it exists for several important reasons:
 *
 * 1. **Type Safety**: Allows LangChain-specific services to declare their dependency on
 *    `IConfigurationProvider<LangChainToolingConfiguration>`, making the configuration
 *    contract explicit and enabling compile-time checking.
 *
 * 2. **Extension Point**: Provides a clear place to add LangChain-specific settings
 *    (e.g., graph execution timeouts, checkpoint intervals, memory limits) without
 *    breaking existing code when those needs arise.
 *
 * 3. **Consistent Pattern**: Maintains symmetry with other extension packages
 *    (Claude, OpenAI), making the SDK easier to understand and navigate.
 *
 * 4. **Dependency Injection**: Services can be designed to accept this specific
 *    configuration type, enabling proper IoC patterns and testability.
 *
 * @example
 * ```typescript
 * // Service declares explicit dependency on LangChain configuration
 * class LangChainService {
 *   constructor(private configProvider: IConfigurationProvider<LangChainToolingConfiguration>) {}
 * }
 *
 * // Future: Add LangChain-specific settings without breaking changes
 * class LangChainToolingConfiguration extends ToolingConfiguration {
 *   get graphExecutionTimeout(): number { ... }
 * }
 * ```
 */
export declare class LangChainToolingConfiguration extends ToolingConfiguration {
    constructor(overrides?: LangChainToolingConfigurationOptions);
}
//# sourceMappingURL=LangChainToolingConfiguration.d.ts.map