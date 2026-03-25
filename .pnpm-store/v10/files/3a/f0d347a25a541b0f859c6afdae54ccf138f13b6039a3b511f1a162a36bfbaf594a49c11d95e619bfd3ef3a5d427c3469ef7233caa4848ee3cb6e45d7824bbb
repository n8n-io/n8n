import { OptionalImportMap, SecretMap } from "./import_type.js";

//#region src/load/index.d.ts
/**
 * Options for loading serialized LangChain objects.
 *
 * @remarks
 * **Security considerations:**
 *
 * Deserialization can instantiate arbitrary classes from the allowed namespaces.
 * When loading untrusted data, be aware that:
 *
 * 1. **`secretsFromEnv`**: Defaults to `false`. Setting to `true` allows the
 *    deserializer to read environment variables, which could leak secrets if
 *    the serialized data contains malicious secret references.
 *
 * 2. **`importMap` / `optionalImportsMap`**: These allow extending which classes
 *    can be instantiated. Never populate these from user input. Only include
 *    modules you explicitly trust.
 *
 * 3. **Class instantiation**: Allowed classes will have their constructors called
 *    with the deserialized kwargs. If a class performs side effects in its
 *    constructor (network calls, file I/O, etc.), those will execute.
 */
interface LoadOptions {
  /**
   * A map of secrets to load. Keys are secret identifiers, values are the secret values.
   *
   * If a secret is not found in this map and `secretsFromEnv` is `false`, an error is
   * thrown. If `secretsFromEnv` is `true`, the secret will be loaded from environment
   * variables (if not found there either, an error is thrown).
   */
  secretsMap?: SecretMap;
  /**
   * Whether to load secrets from environment variables when not found in `secretsMap`.
   *
   * @default false
   *
   * @remarks
   * **Security warning:** Setting this to `true` allows the deserializer to read
   * environment variables, which could be a security risk if the serialized data
   * is not trusted. Only set this to `true` when deserializing data from trusted
   * sources (e.g., your own database, not user input).
   */
  secretsFromEnv?: boolean;
  /**
   * A map of optional imports. Keys are namespace paths (e.g., "langchain_community/llms"),
   * values are the imported modules.
   *
   * @remarks
   * **Security warning:** This extends which classes can be instantiated during
   * deserialization. Never populate this map with values derived from user input.
   * Only include modules that you explicitly trust and have reviewed.
   *
   * Classes in these modules can be instantiated with attacker-controlled kwargs
   * if the serialized data is untrusted.
   */
  optionalImportsMap?: OptionalImportMap;
  /**
   * Additional optional import entrypoints to allow beyond the defaults.
   *
   * @remarks
   * **Security warning:** This extends which namespace paths are considered valid
   * for deserialization. Never populate this array with values derived from user
   * input. Each entrypoint you add expands the attack surface for deserialization.
   */
  optionalImportEntrypoints?: string[];
  /**
   * Additional import map for the "langchain" namespace.
   *
   * @remarks
   * **Security warning:** This extends which classes can be instantiated during
   * deserialization. Never populate this map with values derived from user input.
   * Only include modules that you explicitly trust and have reviewed.
   *
   * Any class exposed through this map can be instantiated with attacker-controlled
   * kwargs if the serialized data is untrusted.
   */
  importMap?: Record<string, unknown>;
  /**
   * Maximum recursion depth allowed during deserialization.
   *
   * @default 50
   *
   * @remarks
   * This limit protects against denial-of-service attacks using deeply nested
   * JSON structures that could cause stack overflow. If your legitimate data
   * requires deeper nesting, you can increase this limit.
   */
  maxDepth?: number;
}
/**
 * Load a LangChain object from a JSON string.
 *
 * **WARNING — insecure deserialization risk.** This function instantiates
 * classes and invokes constructors based on the contents of `text`. If `text`
 * originates from an untrusted source, an attacker can craft a payload that
 * instantiates arbitrary allowed classes with attacker-controlled arguments,
 * potentially causing secret exfiltration, SSRF, or other side effects.
 *
 * Only call `load()` on data you have produced yourself or received from a
 * fully trusted origin (e.g., your own database). **Never deserialize
 * user-supplied or network-received JSON without independent validation.**
 *
 * @param text - The JSON string to parse and load.
 * @param options - Options for loading. See {@link LoadOptions} for security guidance.
 * @returns The loaded LangChain object.
 *
 * @example
 * ```typescript
 * import { load } from "@langchain/core/load";
 * import { AIMessage } from "@langchain/core/messages";
 *
 * // Basic usage - secrets must be provided explicitly
 * const msg = await load<AIMessage>(jsonString);
 *
 * // With secrets from a map (preferred over secretsFromEnv)
 * const msg = await load<AIMessage>(jsonString, {
 *   secretsMap: { OPENAI_API_KEY: "sk-..." }
 * });
 *
 * // Allow loading secrets from environment — ONLY for fully trusted data
 * const msg = await load<AIMessage>(jsonString, {
 *   secretsFromEnv: true
 * });
 * ```
 */
declare function load<T>(text: string, options?: LoadOptions): Promise<T>;
//#endregion
export { LoadOptions, load };
//# sourceMappingURL=index.d.ts.map