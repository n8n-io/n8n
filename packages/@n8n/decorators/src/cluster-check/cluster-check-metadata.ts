import { Container, Service } from '@n8n/di';

import { ClusterCheckClass } from './cluster-check';

/**
 * Registry entry for a cluster check.
 *
 * Lightweight wrapper around the check class constructor, modelled on
 * `ContextEstablishmentHookEntry`. Kept as a wrapper (rather than storing the
 * class directly) so the entry shape can grow — e.g. module source, feature
 * flag, license flag — without breaking the registration API.
 *
 * @internal
 */
type ClusterCheckEntry = {
	/** The check class constructor for DI container instantiation. */
	class: ClusterCheckClass;
};

/**
 * Low-level metadata registry for cluster checks.
 *
 * `ClusterCheckMetadata` is a simple collection of every class decorated with
 * `@ClusterCheck()`. It is populated automatically at module load time, before
 * the Leader Service starts, so checks are discoverable without any manual
 * registration code.
 *
 * **Architecture:**
 * ```
 * @ClusterCheck()   →   ClusterCheckMetadata   →   Cluster Check Registry   →   Leader Service
 *   (registration)         (collection)               (instantiation)              (execution)
 * ```
 *
 * **Responsibilities kept here:**
 * - Storing registered check classes.
 * - Exposing them for downstream consumers.
 *
 * **Responsibilities explicitly NOT here:**
 * - Instantiating checks (DI container).
 * - Validating name uniqueness (higher-level registry).
 * - Executing checks (Leader Service).
 *
 * @see ClusterCheck decorator for automatic registration.
 * @see IClusterCheck for the check contract.
 */
@Service()
export class ClusterCheckMetadata {
	/**
	 * Internal collection of registered cluster check entries.
	 *
	 * Uses `Set` for efficient deduplication (though duplicate registration
	 * should not occur with correct decorator usage).
	 */
	private readonly clusterChecks: Set<ClusterCheckEntry> = new Set();

	/**
	 * Registers a cluster check class in the metadata collection.
	 *
	 * Called automatically by the `@ClusterCheck()` decorator at module load
	 * time. Should not be called directly by application code.
	 *
	 * Name uniqueness and any other semantic validation is the responsibility
	 * of the higher-level Cluster Check Registry, not this service.
	 *
	 * @param entry - The check class entry to register.
	 * @internal Called by decorator only.
	 */
	register(entry: ClusterCheckEntry) {
		this.clusterChecks.add(entry);
	}

	/**
	 * Retrieves all registered check class constructors in registration order.
	 *
	 * This is the primary method consumed by the Cluster Check Registry to
	 * instantiate checks via the DI container.
	 *
	 * @returns Array of check class constructors ready for DI instantiation.
	 *
	 * @example
	 * ```typescript
	 * @Service()
	 * export class ClusterCheckRegistry {
	 *   constructor(private readonly metadata: ClusterCheckMetadata) {
	 *     this.checks = this.metadata.getClasses().map((cls) => Container.get(cls));
	 *   }
	 * }
	 * ```
	 */
	getClasses() {
		return [...this.clusterChecks.values()].map((entry) => entry.class);
	}
}

/**
 * Class decorator that registers a cluster check for auto-discovery.
 *
 * Performs two distinct operations at class-definition time:
 * 1. **Registers** the class in {@link ClusterCheckMetadata} so the higher-level
 *    registry can discover it without manual wiring.
 * 2. **Enables DI** by applying `@Service()`, making the class constructor
 *    resolvable via `Container.get()` (including dependencies).
 *
 * The decorator takes no arguments — all check metadata lives on the check
 * instance itself via {@link IClusterCheck.checkDescription}.
 *
 * **Requirements:**
 * - Decorated class MUST implement {@link IClusterCheck}.
 * - Decorated class MUST expose a `checkDescription` with a unique `name`.
 *
 * **Notes:**
 * - Registration happens eagerly at module load, not lazily.
 * - Duplicate decoration of the same class is safe (`Set` deduplicates).
 * - Checks are registered as singletons via `@Service()`.
 *
 * @example
 * ```typescript
 * @ClusterCheck()
 * export class VersionMismatchCheck implements IClusterCheck {
 *   checkDescription = {
 *     name: 'cluster.versionMismatch',
 *     displayName: 'Cluster Version Mismatch',
 *   };
 *
 *   async run({ currentState }: ClusterCheckContext): Promise<ClusterCheckResult> {
 *     // ... check logic
 *     return {};
 *   }
 * }
 * ```
 *
 * @returns A class decorator that registers the check and enables DI for it.
 */
export const ClusterCheck =
	<T extends ClusterCheckClass>() =>
	(target: T) => {
		Container.get(ClusterCheckMetadata).register({
			class: target,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
