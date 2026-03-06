import { Container, Service } from '@n8n/di';

import { ContextEstablishmentHookClass } from './context-establishment-hook';

/**
 * Registry entry for a context establishment hook.
 *
 * This is a lightweight wrapper around the hook class constructor that can be
 * extended in the future to include additional metadata if needed (e.g., module
 * source, registration timestamp, feature flags, license flags).
 *
 * @internal
 */
type ContextEstablishmentHookEntry = {
	/** The hook class constructor for DI container instantiation */
	class: ContextEstablishmentHookClass;
};

/**
 * Low-level metadata registry for context establishment hooks.
 *
 * This service acts as a simple collection of registered hook classes that gets
 * populated automatically by the @ContextEstablishmentHook decorator at module
 * load time. It serves as the foundation for the higher-level Hook Registry.
 *
 * **Architecture:**
 * ```
 * Decorator → ContextEstablishmentHookMetadata → Hook Registry → Execution Engine
 *    (registration)        (collection)           (discovery)      (execution)
 * ```
 *
 * @see ContextEstablishmentHook decorator for automatic registration
 * @see IContextEstablishmentHook for hook interface
 */
@Service()
export class ContextEstablishmentHookMetadata {
	/**
	 * Internal collection of registered hook classes.
	 *
	 * Uses Set for efficient deduplication (though duplicate registration
	 * should not occur with proper decorator usage).
	 */
	private readonly contextEstablishmentHooks: Set<ContextEstablishmentHookEntry> = new Set();

	/**
	 * Registers a hook class in the metadata collection.
	 *
	 * Called automatically by the @ContextEstablishmentHook decorator during
	 * module loading. Should not be called directly by application code.
	 *
	 * **Note:** This method does not validate uniqueness or check for naming
	 * conflicts. Validation happens later in the Hook Registry.
	 *
	 * @param hookEntry - The hook class entry to register
	 *
	 * @internal Called by decorator only
	 */
	register(hookEntry: ContextEstablishmentHookEntry) {
		this.contextEstablishmentHooks.add(hookEntry);
	}

	/**
	 * Retrieves all registered hook entries.
	 *
	 * Returns an array of [index, entry] tuples compatible with Set.entries().
	 * Primarily used for debugging or low-level iteration.
	 *
	 * **Prefer getClasses()** for most use cases as it returns just the classes.
	 *
	 * @returns Array of [index, entry] tuples from the internal Set
	 *
	 * @example
	 * ```typescript
	 * const entries = metadata.getEntries();
	 * for (const [index, entry] of entries) {
	 *   console.log(`Hook ${index}:`, entry.class.name);
	 * }
	 * ```
	 */
	getEntries() {
		return [...this.contextEstablishmentHooks.entries()];
	}

	/**
	 * Retrieves all registered hook classes.
	 *
	 * This is the primary method used by the Hook Registry to obtain hook classes
	 * for instantiation and indexing. Returns just the class constructors without
	 * the wrapper entry objects.
	 *
	 * **Usage pattern:**
	 * ```typescript
	 * const classes = metadata.getClasses();
	 * const hooks = classes.map(HookClass => Container.get(HookClass));
	 * const hooksByName = new Map(hooks.map(h => [h.hookDescription.name, h]));
	 * ```
	 *
	 * @returns Array of hook class constructors ready for DI instantiation
	 *
	 * @example
	 * ```typescript
	 * @Service()
	 * export class HookRegistry {
	 *   constructor(
	 *     private metadata: ContextEstablishmentHookMetadata,
	 *     private container: Container
	 *   ) {
	 *     const hookClasses = metadata.getClasses();
	 *     this.hooks = hookClasses.map(cls => container.get(cls));
	 *   }
	 * }
	 * ```
	 */
	getClasses() {
		return [...this.contextEstablishmentHooks.values()].map((entry) => entry.class);
	}
}

/**
 * Class decorator for context establishment hooks.
 *
 * This decorator performs two critical functions:
 * 1. **Registers** the hook class in ContextEstablishmentHookMetadata for discovery
 * 2. **Enables DI** by applying @Service() to make the hook injectable
 *
 * The decorator executes at module load time (when the class is defined), ensuring
 * all hooks are registered before the application starts. This enables automatic
 * discovery without manual registration code.
 *
 * **Registration flow:**
 * ```
 * @ContextEstablishmentHook()         // 1. Decorator executes
 * export class BearerTokenHook        // 2. Class is defined
 *   ↓
 * ContextEstablishmentHookMetadata    // 3. Hook class registered in metadata
 *   ↓
 * @Service()                           // 4. DI container registration
 *   ↓
 * Hook is discoverable & injectable   // 5. Ready for use
 * ```
 *
 * **Design pattern:**
 * This follows the declarative registration pattern used throughout n8n for
 * extensibility (similar to node registration). Hooks self-register without
 * requiring central registration files or manual imports.
 *
 * **Requirements:**
 * - Decorated class MUST implement IContextEstablishmentHook
 * - Decorated class MUST have a hookDescription property with unique name
 *
 * **Important notes:**
 * - No decorator parameters needed (hook metadata lives on hook instance)
 * - Hooks are registered as singletons via @Service()
 * - Registration happens eagerly at module load, not lazily
 * - Duplicate decoration of the same class is safe (Set deduplicates)
 *
 * @see IContextEstablishmentHook for interface requirements
 * @see ContextEstablishmentHookMetadata for underlying registry
 * @see HookDescription for hook metadata structure
 *
 * @example
 * ```typescript
 * // Basic hook registration:
 * @ContextEstablishmentHook()
 * export class BearerTokenHook implements IContextEstablishmentHook {
 *   hookDescription = {
 *     name: 'credentials.bearerToken'
 *   };
 *
 *   async execute(options: ContextEstablishmentOptions) {
 *     // Extract bearer token from Authorization header
 *     const token = this.extractToken(options.triggerItem);
 *     return {
 *       triggerItem: this.removeAuthHeader(options.triggerItem),
 *       contextUpdate: {
 *         credentials: { version: 1, identity: token }
 *       }
 *     };
 *   }
 *
 *   isApplicableToTriggerNode(nodeType: string) {
 *     return nodeType === 'n8n-nodes-base.webhook';
 *   }
 * }
 * ```
 *
 * @returns A class decorator function that registers and enables DI for the hook
 */
export const ContextEstablishmentHook =
	<T extends ContextEstablishmentHookClass>() =>
	(target: T) => {
		// Register hook class in metadata for discovery by Hook Registry
		Container.get(ContextEstablishmentHookMetadata).register({
			class: target,
		});

		// Enable dependency injection for the hook class
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
