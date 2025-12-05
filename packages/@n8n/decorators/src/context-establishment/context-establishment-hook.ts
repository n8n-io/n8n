import type { Constructable } from '@n8n/di';
import type {
	INode,
	INodeExecutionData,
	INodeProperties,
	PlaintextExecutionContext,
	Workflow,
} from 'n8n-workflow';

/**
 * Input parameters passed to a context establishment hook during execution.
 *
 * Hooks receive the current workflow state and extract information from
 * trigger items to build the execution context (e.g., credentials, environment).
 * All hooks work with plaintext (decrypted) context for runtime operations.
 *
 * @see IContextEstablishmentHook
 * @see PlaintextExecutionContext
 */
export type ContextEstablishmentOptions = {
	/** The trigger node that initiated the workflow execution */
	triggerNode: INode;

	/** The complete workflow definition */
	workflow: Workflow;

	/**
	 * Trigger items from the workflow execution start.
	 * This array represents items as modified by previous hooks in the chain.
	 * Hooks can extract data from these items and optionally modify them
	 * (e.g., removing sensitive headers before storage).
	 */
	triggerItems: INodeExecutionData[] | null;

	/**
	 * The plaintext execution context built so far.
	 * Includes base context plus results from any previously executed hooks.
	 * Contains decrypted credential data for runtime operations.
	 *
	 * @see PlaintextExecutionContext for security considerations
	 */
	context: PlaintextExecutionContext;

	/**
	 * Hook-specific configuration provided by the trigger node.
	 * Structure varies per hook type (e.g., { removeFromItem: true } for bearer token hook).
	 */
	options?: Record<string, unknown>;
};

/**
 * Result returned by a context establishment hook after execution.
 *
 * Hooks can modify trigger items (e.g., remove sensitive headers) and
 * contribute partial context updates that get merged into the execution context.
 * All context data is in plaintext form during hook execution.
 *
 * @see IContextEstablishmentHook
 * @see PlaintextExecutionContext
 */
export type ContextEstablishmentResult = {
	/**
	 * The potentially modified trigger items.
	 * If undefined, the original trigger items are preserved unchanged.
	 *
	 * Common use case: Removing sensitive data (e.g., Authorization headers)
	 * before storing items in execution history.
	 *
	 * @example
	 * ```typescript
	 * // Remove Authorization header from trigger items
	 * const modifiedItems = options.triggerItems.map(item => ({
	 *   ...item,
	 *   json: {
	 *     ...item.json,
	 *     headers: {
	 *       ...item.json.headers,
	 *       authorization: undefined
	 *     }
	 *   }
	 * }));
	 * return { triggerItems: modifiedItems, contextUpdate: { ... } };
	 * ```
	 */
	triggerItems?: INodeExecutionData[];

	/**
	 * Partial context update to merge into the execution context.
	 * If undefined, no context updates are applied.
	 *
	 * Contains only this hook's contributions (e.g., credentials data).
	 * Multiple hooks' updates are merged sequentially during execution.
	 * Context data is in plaintext form and will be encrypted before persistence.
	 *
	 * @example
	 * ```typescript
	 * // Add credential context from bearer token
	 * return {
	 *   triggerItems: modifiedItems,
	 *   contextUpdate: {
	 *     credentials: {
	 *       version: 1,
	 *       identity: extractedToken,
	 *       metadata: { source: 'bearer-token' }
	 *     }
	 *   }
	 * };
	 * ```
	 */
	contextUpdate?: Partial<PlaintextExecutionContext>;
};

/**
 * Metadata describing a context establishment hook.
 *
 * This object carries self-describing information about the hook that enables
 * runtime discovery, lookup, and instantiation. Each hook instance serves as
 * the single source of truth for its own metadata.
 *
 * **Design rationale:**
 * - Hook instances are self-describing (no external configuration files)
 * - Name lookup happens at runtime via Registry, not during registration
 * - Description can be extended without changing decorator or registry internals
 * - Supports future features like versioning, schema validation, and categorization
 *
 * **Future extensions** may include:
 * - `version?: string` - Semantic version of hook implementation for compatibility checks
 * - `configSchema?: ZodSchema` - Validation schema for hook-specific options
 * - `tags?: string[]` - Categorization tags for grouping and filtering
 * - `applicableTriggers?: string[]` - Cached list of compatible trigger node types
 * - `deprecated?: boolean | string` - Deprecation status and migration guidance
 *
 * @see IContextEstablishmentHook.hookDescription
 * @see ContextEstablishmentHookMetadata for registration mechanism
 *
 * @example
 * ```typescript
 * @ContextEstablishmentHook()
 * export class BearerTokenHook implements IContextEstablishmentHook {
 *   hookDescription = {
 *     name: 'credentials.bearerToken',
 *     displayName: 'Bearer Token',
 *     options: [
 *       {
 *         displayName: 'Remove from Item',
 *         name: 'removeFromItem',
 *         type: 'boolean',
 *         default: true,
 *         description: 'Whether to remove the Authorization header from the trigger item'
 *       }
 *     ]
 *   };
 *
 *   // ... hook implementation
 * }
 *
 * ```
 */
export type HookDescription = {
	/**
	 * Unique identifier for this hook type.
	 *
	 * Used by the Hook Registry (to be implemented) to index and retrieve
	 * hook instances at runtime. Must be unique across all registered hooks.
	 *
	 * **Naming convention**: Use namespaced names like 'credentials.bearerToken'
	 * or 'envVars.tenantConfig' to organize hooks by domain and avoid collisions.
	 *
	 * **Usage contexts:**
	 * - Trigger node configuration specifies hooks by name
	 * - Hook Registry uses name as lookup key
	 * - UI displays localized names via i18n (e.g., `hooks.${name}.displayName`)
	 * - Logging and debugging references hooks by name
	 * - Error messages include hook name for troubleshooting
	 *
	 * **Versioning**: Future hook versions can use naming like 'credentials.bearerToken.v2'
	 * if breaking changes are needed, though this is not required initially.
	 *
	 * @example 'credentials.bearerToken'
	 * @example 'credentials.apiKey'
	 * @example 'envVars.tenantConfig'
	 * @example 'audit.requestMetadata'
	 */
	name: string;

	/**
	 * Human-readable display name for the hook.
	 * Used in the UI when presenting the hook selection to users.
	 * If not provided, the name will be used as the display name.
	 *
	 * @example 'Bearer Token Authentication'
	 * @example 'API Key from Header'
	 */
	displayName?: string;

	/**
	 * Hook-specific configuration options that will be exposed in the trigger node UI.
	 * These options are passed to the hook's execute() method via the options parameter.
	 *
	 * Each option should be a valid node property object with at minimum:
	 * displayName, name, type, and default fields.
	 *
	 * @example
	 * ```typescript
	 * options: [
	 *   {
	 *     displayName: 'Remove from Item',
	 *     name: 'removeFromItem',
	 *     type: 'boolean',
	 *     default: true,
	 *     description: 'Whether to remove the Authorization header from trigger items'
	 *   },
	 *   {
	 *     displayName: 'Header Name',
	 *     name: 'headerName',
	 *     type: 'string',
	 *     default: 'Authorization',
	 *     description: 'The name of the header containing the bearer token'
	 *   }
	 * ]
	 * ```
	 */
	options?: INodeProperties[];
};

/**
 * Interface for context establishment hooks that extract data from trigger
 * items and extend the execution context during workflow initialization.
 *
 * @see ContextEstablishmentOptions - Input parameters
 * @see ContextEstablishmentResult - Output structure
 * @see PlaintextExecutionContext - Runtime context type with decrypted data
 */
export interface IContextEstablishmentHook {
	/**
	 * Self-describing metadata for this hook instance.
	 *
	 * Provides the unique name and future metadata used by the Hook Registry
	 * for discovery, lookup, and validation. This property makes each hook
	 * instance self-contained and discoverable without external configuration.
	 *
	 * @see HookDescription for detailed metadata structure and future extensions
	 *
	 * @example
	 * ```typescript
	 * @ContextEstablishmentHook()
	 * export class BearerTokenHook implements IContextEstablishmentHook {
	 *   hookDescription = {
	 *     name: 'credentials.bearerToken'
	 *   };
	 *
	 *   async execute(options: ContextEstablishmentOptions) {
	 *     // Hook implementation
	 *   }
	 *
	 *   isApplicableToTriggerNode(nodeType: string) {
	 *     return nodeType === 'n8n-nodes-base.webhook';
	 *   }
	 * }
	 * ```
	 */
	hookDescription: HookDescription;
	/**
	 * Executes the hook to extract context data from trigger information.
	 *
	 * **Implementation requirements:**
	 * 1. Extract relevant data from trigger items (headers, body, query params, etc.)
	 * 2. Optionally modify trigger items to remove sensitive data, if these are not provided in the response they are not modified
	 * 3. Return partial context updates to merge into execution context
	 * 4. Throw errors for unrecoverable failures (stops workflow execution)
	 *
	 * **Execution order:**
	 * Hooks execute sequentially in the order configured by the trigger node.
	 * Each hook receives:
	 * - Trigger items as modified by all previous hooks
	 * - Context with updates from all previous hooks
	 *
	 * **Context handling:**
	 * - Input context is plaintext (PlaintextExecutionContext) for runtime operations
	 * - Output updates are plaintext and will be encrypted before persistence
	 * - Never log or expose plaintext context outside hook execution
	 *
	 * **Error handling:**
	 * - Throw errors if required data is missing (e.g., expected header not found)
	 * - Use descriptive error messages for debugging
	 * - Errors stop workflow execution (fail-fast approach)
	 *
	 * @param options - Input parameters including trigger node, workflow, items, and current context
	 * @returns Promise resolving to modified trigger items and context updates
	 * @throws Error if hook execution fails (stops workflow execution)
	 *
	 * @example
	 * ```typescript
	 * async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
	 *   const removeHeader = options.options?.removeFromItem ?? true;
	 *
	 *   // Extract data
	 *   const token = this.extractToken(options.triggerItems);
	 *   if (!token) {
	 *     throw new Error('Bearer token not found in Authorization header');
	 *   }
	 *
	 *   // Optionally modify items
	 *   const modifiedItems = removeHeader
	 *     ? this.removeAuthHeader(options.triggerItems)
	 *     : undefined;
	 *
	 *   // Return context update
	 *   return {
	 *     triggerItems: modifiedItems,
	 *     contextUpdate: {
	 *       credentials: { version: 1, identity: token }
	 *     }
	 *   };
	 * }
	 * ```
	 */
	execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult>;

	/**
	 * Method to determine if this hook is applicable to a specific trigger node type.
	 *
	 * **Use cases:**
	 * - **UI filtering**: Show only relevant hooks for a trigger type in node configuration
	 * - **Validation**: Prevent incompatible hook configurations at save time
	 * - **Auto-suggestion**: Suggest applicable hooks based on trigger node selection
	 * - **Documentation**: Generate trigger-specific hook documentation
	 *
	 * **Implementation notes:**
	 * - Return true if the hook can extract meaningful data from this trigger type
	 * - Consider transport layer (HTTP, AMQP, manual, etc.)
	 * - Multiple triggers can share the same hook (e.g., webhook and form trigger both support bearer tokens)
	 *
	 * @param nodeType - The node type identifier (e.g., 'n8n-nodes-base.webhook')
	 * @returns true if this hook can be used with the given trigger node type
	 *
	 * @example
	 * ```typescript
	 * // Hook only works with HTTP-based triggers
	 * isApplicableToTriggerNode(nodeType: string): boolean {
	 *   return [
	 *     'n8n-nodes-base.webhook',
	 *     'n8n-nodes-base.formTrigger',
	 *     'n8n-nodes-base.httpRequest'
	 *   ].includes(nodeType);
	 * }
	 * ```
	 *
	 * @example
	 * ```typescript
	 * // Hook works with any trigger that has HTTP headers
	 * isApplicableToTriggerNode(nodeType: string): boolean {
	 *   return nodeType.includes('webhook') || nodeType.includes('http');
	 * }
	 * ```
	 */
	isApplicableToTriggerNode(nodeType: string): boolean;

	/**
	 * Optional hook initialization method called during registry setup.
	 *
	 * Use this to perform one-time setup operations before the hook starts
	 * processing workflow executions (e.g., loading configuration, establishing
	 * connections, validating dependencies).
	 *
	 * **Lifecycle:**
	 * - Called once during application startup when ExecutionContextHookRegistry.init() runs
	 * - Can be called multiple times if the registry is reinitialized
	 * - Called AFTER DI container instantiates the hook but BEFORE registration in the registry
	 *
	 * **Error handling:**
	 * - If init() throws an error, the hook is NOT registered and will be unavailable
	 * - The error is logged but does not stop other hooks from initializing
	 * - Other hooks continue to load normally even if one fails
	 * - Only throw errors for failures that make the hook unusable
	 *
	 * **Best practices:**
	 * - Keep initialization fast (avoid blocking operations)
	 * - Don't allocate resources in constructor - do it here instead
	 * - Make init() idempotent (safe to call multiple times)
	 * - Throw errors only when the hook cannot function without successful initialization
	 * - Add logging for initialization steps to aid debugging
	 *
	 * @returns Promise that resolves when initialization is complete
	 * @throws Error if initialization fails and hook should not be registered
	 *
	 * @example
	 * ```typescript
	 * @ContextEstablishmentHook()
	 * export class CustomHook implements IContextEstablishmentHook {
	 *   hookDescription = { name: 'custom.hook' };
	 *
	 *   private config!: ConfigData;
	 *
	 *   async init() {
	 *     // Load required configuration
	 *     this.config = await this.loadConfig();
	 *     if (!this.config) {
	 *       throw new Error('Failed to load required configuration');
	 *     }
	 *   }
	 *
	 *   async execute(options: ContextEstablishmentOptions) {
	 *     // Config is guaranteed to be loaded if init() succeeded
	 *     return this.processWithConfig(options, this.config);
	 *   }
	 * }
	 * ```
	 */
	init?(): Promise<void>;
}

/**
 * Type representing the constructor/class of a context establishment hook.
 *
 * Used by the dependency injection container to register and instantiate
 * hook classes at runtime. Works with the @ContextEstablishmentHook decorator.
 *
 * @see IContextEstablishmentHook
 * @see ContextEstablishmentHook decorator in './index.ts'
 *
 * @example
 * ```typescript
 * import { Container } from '@n8n/di';
 * import type { ContextEstablishmentHookClass } from './context-establishment-hook';
 *
 * const HookClass: ContextEstablishmentHookClass = BearerTokenHook;
 * const hookInstance = Container.get(HookClass);
 * ```
 */
export type ContextEstablishmentHookClass = Constructable<IContextEstablishmentHook>;
