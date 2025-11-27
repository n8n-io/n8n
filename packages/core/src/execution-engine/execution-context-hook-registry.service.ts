import { Logger } from '@n8n/backend-common';
import { ContextEstablishmentHookMetadata, IContextEstablishmentHook } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';

/**
 * Registry for managing context establishment hooks during workflow execution.
 *
 * Provides discovery and access to hooks that extract data from trigger items
 * and build execution context (credentials, environment variables, etc.).
 * Hooks are automatically discovered via the @ContextEstablishmentHook decorator.
 */
@Service()
export class ExecutionContextHookRegistry {
	private hookMap: Map<string, IContextEstablishmentHook> = new Map();

	constructor(
		private readonly executionContextHookMetadata: ContextEstablishmentHookMetadata,
		private readonly logger: Logger,
	) {}

	/**
	 * Initializes the registry by loading all decorated hooks from metadata.
	 *
	 * - Clears any previously registered hooks
	 * - Instantiates hooks via DI container
	 * - Calls optional hook.init() methods
	 * - Handles duplicate hook names (first wins, logs warning)
	 *
	 * Should be called at least once during application startup, but it can be called
	 * multiple times if needed (e.g. to reload hooks).
	 */
	async init() {
		this.hookMap.clear();

		const hookClasses = this.executionContextHookMetadata.getClasses();
		this.logger.debug(`Registering ${hookClasses.length} execution context hooks.`);

		for (const HookClass of hookClasses) {
			let hook: IContextEstablishmentHook;
			try {
				hook = Container.get(HookClass);
			} catch (error) {
				this.logger.error(
					`Failed to instantiate execution context hook class "${HookClass.name}": ${(error as Error).message}`,
					{ error },
				);
				continue;
			}

			if (this.hookMap.has(hook.hookDescription.name)) {
				this.logger.warn(
					`Execution context hook with name "${hook.hookDescription.name}" is already registered. Conflicting classes are "${this.hookMap.get(hook.hookDescription.name)?.constructor.name}" and "${HookClass.name}". Skipping the latter.`,
				);
				continue;
			}
			if (hook.init) {
				try {
					await hook.init();
				} catch (error) {
					this.logger.error(
						`Failed to initialize execution context hook "${hook.hookDescription.name}": ${(error as Error).message}`,
						{ error },
					);
					continue;
				}
			}
			this.hookMap.set(hook.hookDescription.name, hook);
		}
	}

	/**
	 * Retrieves a hook by its unique name.
	 *
	 * @param name - The hook name (e.g., 'credentials.bearerToken')
	 * @returns The hook instance, or undefined if not found
	 */
	getHookByName(name: string): IContextEstablishmentHook | undefined {
		return this.hookMap.get(name);
	}

	/**
	 * Returns all registered hooks.
	 *
	 * @returns Array of all hook instances
	 */
	getAllHooks(): IContextEstablishmentHook[] {
		return Array.from(this.hookMap.values());
	}

	/**
	 * Finds hooks applicable to a specific trigger node type.
	 *
	 * Filters hooks by calling their isApplicableToTriggerNode() method.
	 * Useful for UI filtering and validation.
	 *
	 * @param triggerType - The node type identifier (e.g., 'n8n-nodes-base.webhook')
	 * @returns Array of applicable hooks (may be empty)
	 */
	getHookForTriggerType(triggerType: string): IContextEstablishmentHook[] {
		return Array.from(this.hookMap.values()).filter((hook) => {
			return hook.isApplicableToTriggerNode(triggerType);
		});
	}
}
