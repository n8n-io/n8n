import type { InstanceRegistration } from '@n8n/api-types';
import type { Constructable } from '@n8n/di';

/**
 * Structured difference between two cluster state snapshots.
 *
 * Computed once by the Cluster Check Registry from the current and previous
 * `Map<instanceKey, InstanceRegistration>` snapshots, then passed to every
 * registered check via {@link ClusterCheckContext}. Checks consume the diff
 * read-only — they never mutate it and they never recompute it themselves.
 *
 * **Semantics:**
 * - `added`: instances present in the current snapshot that were not in the previous snapshot.
 * - `removed`: instances present in the previous snapshot that are no longer in the current snapshot.
 * - `changed`: instances present in both snapshots whose registration payload differs
 *   (e.g. role flip, version bump, `lastSeen` refresh). Each entry carries both the
 *   `previous` and `current` registration so checks can reason about the transition.
 *
 * **Equality definition for `changed`** is deliberately left to the registry so checks
 * do not depend on a specific equality strategy (deep-equal, selected-field compare, etc.).
 *
 * @example
 * ```typescript
 * async run({ diff }: ClusterCheckContext) {
 *   const leadershipFlipped = diff.changed.filter(
 *     ({ previous, current }) =>
 *       previous.instanceRole !== current.instanceRole &&
 *       current.instanceRole === 'leader',
 *   );
 * }
 * ```
 */
export type ClusterStateDiff = {
	/** Instances present in the current snapshot that were not in the previous one. */
	added: readonly InstanceRegistration[];

	/** Instances present in the previous snapshot that are no longer in the current one. */
	removed: readonly InstanceRegistration[];

	/**
	 * Instances whose registration payload changed between snapshots.
	 * Each entry carries both the `previous` and `current` registration.
	 */
	changed: ReadonlyArray<{ previous: InstanceRegistration; current: InstanceRegistration }>;
};

/**
 * Input context passed to a cluster check on every invocation.
 *
 * The context bundles the two state snapshots the check reasons over (current and
 * previous) together with a pre-computed {@link ClusterStateDiff}. Snapshots are
 * keyed by `instanceKey` to match the existing instance storage contract
 * (`InstanceStorage.getLastKnownState()` / `saveLastKnownState()`).
 *
 * **Read-only by contract:** the maps and the diff are shared across every
 * registered check in a single run. Checks must not mutate them. The types
 * enforce this with `ReadonlyMap` and `readonly` arrays.
 *
 * @example
 * ```typescript
 * async run({ currentState, previousState, diff }: ClusterCheckContext) {
 *   const currentCount = currentState.size;
 *   const previousCount = previousState.size;
 *   const flapping = diff.added.length > 0 && diff.removed.length > 0;
 *   // ...
 * }
 * ```
 */
export type ClusterCheckContext = {
	/** Current cluster state keyed by `instanceKey`. */
	currentState: ReadonlyMap<string, InstanceRegistration>;

	/**
	 * Previous cluster state keyed by `instanceKey`.
	 *
	 * Sourced from `InstanceStorage.getLastKnownState()`. May be empty on the very
	 * first check run after a fresh leader start.
	 */
	previousState: ReadonlyMap<string, InstanceRegistration>;

	/**
	 * Structured diff between `previousState` and `currentState`.
	 *
	 * Pre-computed by the registry so every check reuses the same diff result.
	 */
	diff: ClusterStateDiff;
};

/**
 * Structured warning emitted by a cluster check.
 *
 * Warnings are a neutral, transport-agnostic signal the check wants to raise
 * about the cluster. A downstream handler in `packages/cli` decides how to
 * surface them (logs, metrics, admin dashboard, etc.).
 *
 * @example
 * ```typescript
 * {
 *   code: 'cluster.versionMismatch',
 *   message: 'Detected 2 distinct n8n versions across 5 instances',
 *   severity: 'warning',
 *   context: { versions: ['1.42.0', '1.43.0'] },
 * }
 * ```
 */
export type ClusterCheckWarning = {
	/**
	 * Stable machine-readable identifier for the warning.
	 *
	 * Should be namespaced, e.g. `'cluster.versionMismatch'`, `'cluster.leaderMissing'`.
	 * Consumers key off this field for dedup, i18n, and aggregation.
	 */
	code: string;

	/** Human-readable single-line summary. */
	message: string;

	/**
	 * Severity hint. Defaults to `'warning'` if omitted.
	 *
	 * Kept deliberately narrow — finer-grained categorisation belongs to the
	 * downstream translator, not to the decorator layer.
	 */
	severity?: 'info' | 'warning' | 'error';

	/**
	 * Optional structured context for the warning (e.g. offending instance keys,
	 * observed values). Serialised verbatim by downstream handlers.
	 */
	context?: Record<string, unknown>;
};

/**
 * Structured audit event emitted by a cluster check.
 *
 * Audit events are intentionally loose at this layer: the `@n8n/decorators`
 * package must not depend on the cli audit event enum. A downstream translator
 * maps `eventName` to the concrete `EventMessageAudit` class at emit time.
 *
 * @example
 * ```typescript
 * {
 *   eventName: 'n8n.audit.cluster.version-mismatch-detected',
 *   payload: { detectedVersions: ['1.42.0', '1.43.0'], instanceCount: 5 },
 * }
 * ```
 */
export type ClusterCheckAuditEvent = {
	/**
	 * Audit event name the downstream translator will map to a concrete
	 * audit event class (e.g. `EventMessageAudit`).
	 */
	eventName: string;

	/** Event payload forwarded to the audit bus. Shape depends on `eventName`. */
	payload: Record<string, unknown>;
};

/**
 * Structured push notification emitted by a cluster check.
 *
 * Kept decoupled from the concrete `PushMessage` discriminated union defined in
 * `@n8n/api-types/push` so the decorator package stays free of transport-type
 * churn. A downstream translator narrows `{ type, data }` into the concrete
 * push message union before broadcasting.
 *
 * @example
 * ```typescript
 * {
 *   type: 'cluster-version-mismatch',
 *   data: { versions: ['1.42.0', '1.43.0'] },
 * }
 * ```
 */
export type ClusterCheckPushNotification = {
	/**
	 * Push message type string the downstream translator maps to a concrete
	 * `PushMessage` variant.
	 */
	type: string;

	/** Push payload forwarded to connected clients. Shape depends on `type`. */
	data: Record<string, unknown>;
};

/**
 * Result returned by a cluster check after processing a {@link ClusterCheckContext}.
 *
 * All fields are optional. A check that finds nothing worth reporting returns
 * an empty object (or populates only the channels it needs). The registry
 * aggregates results from every registered check and forwards each channel
 * (warnings, audit events, push notifications) to its downstream handler.
 *
 * **Why three separate channels?** Each has a distinct consumer:
 * - `warnings` feeds admin-facing diagnostics and logs.
 * - `auditEvents` feeds the audit log / event bus for compliance.
 * - `pushNotifications` feeds the real-time push channel to frontends.
 *
 * @example
 * ```typescript
 * return {
 *   warnings: [{ code: 'cluster.leaderMissing', message: 'No leader in cluster', severity: 'error' }],
 *   auditEvents: [{ eventName: 'n8n.audit.cluster.leader-lost', payload: {} }],
 *   pushNotifications: [{ type: 'cluster-leader-lost', data: {} }],
 * };
 * ```
 */
export type ClusterCheckResult = {
	/** Warnings raised by the check. Omit or leave empty when nothing to report. */
	warnings?: ClusterCheckWarning[];

	/** Audit events the check wants emitted. Omit or leave empty when not applicable. */
	auditEvents?: ClusterCheckAuditEvent[];

	/** Push notifications the check wants broadcast. Omit or leave empty when not applicable. */
	pushNotifications?: ClusterCheckPushNotification[];
};

/**
 * Self-describing metadata for a cluster check.
 *
 * Each check instance carries its own description rather than passing it into
 * the `@ClusterCheck()` decorator. This keeps the decorator parameter-free and
 * lets checks compute display names from runtime data if needed.
 *
 * **Naming convention:** use namespaced lowercase ids, e.g.
 * `'cluster.versionMismatch'`, `'cluster.leaderMissing'`. Names must be unique
 * across all registered checks — uniqueness is validated by the higher-level
 * registry, not by {@link ClusterCheckMetadata}.
 *
 * @example
 * ```typescript
 * checkDescription = {
 *   name: 'cluster.versionMismatch',
 *   displayName: 'Cluster Version Mismatch',
 * };
 * ```
 */
export type CheckDescription = {
	/**
	 * Unique machine-readable identifier for this check.
	 *
	 * **Naming convention:** namespaced lowercase, e.g. `'cluster.versionMismatch'`.
	 * Used as the lookup key by the higher-level registry and in logs / telemetry.
	 */
	name: string;

	/**
	 * Human-readable display name for the check. Shown in admin UI and logs.
	 * Falls back to `name` when omitted.
	 */
	displayName?: string;
};

/**
 * Interface every cluster check must implement.
 *
 * Checks are stateless consumers of cluster state snapshots. The registry
 * invokes `run()` on every reconciliation tick, passes a pre-built
 * {@link ClusterCheckContext}, and forwards the returned
 * {@link ClusterCheckResult} to the appropriate downstream handlers.
 *
 * **Lifecycle:**
 * 1. Class is decorated with `@ClusterCheck()` — registered in
 *    {@link ClusterCheckMetadata} and made injectable via `@Service()`.
 * 2. Leader Service resolves the class from the DI container on startup.
 * 3. `run()` is invoked on every tick with a fresh context.
 *
 * **Implementation rules:**
 * - `run()` must be pure with respect to `context` — never mutate the maps or diff.
 * - `run()` must be fast; it runs on the hot path of every reconciliation tick.
 * - Throw only for unrecoverable failures. The registry logs and isolates errors
 *   so one failing check does not stop the others from running.
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
 *     const versions = new Set(
 *       [...currentState.values()].map((instance) => instance.version),
 *     );
 *     if (versions.size <= 1) return {};
 *     return {
 *       warnings: [
 *         {
 *           code: 'cluster.versionMismatch',
 *           message: `Detected ${versions.size} distinct n8n versions in the cluster`,
 *           severity: 'warning',
 *           context: { versions: [...versions] },
 *         },
 *       ],
 *     };
 *   }
 * }
 * ```
 */
export interface IClusterCheck {
	/**
	 * Self-describing metadata used by the registry for lookup and display.
	 *
	 * @see CheckDescription for naming conventions and uniqueness requirements.
	 */
	checkDescription: CheckDescription;

	/**
	 * Runs the check over a cluster state snapshot.
	 *
	 * **Contract:**
	 * - Must treat `context` as read-only.
	 * - Must not log or persist plaintext state beyond what the returned
	 *   {@link ClusterCheckResult} declares.
	 * - Errors thrown here stop this check's contribution to the current tick
	 *   but do not stop other checks. The registry is responsible for error isolation.
	 *
	 * @param context - Current/previous cluster state and pre-computed diff.
	 * @returns Warnings, audit events, and push notifications the check wants emitted.
	 */
	run(context: ClusterCheckContext): Promise<ClusterCheckResult>;
}

/**
 * Type representing the constructor of a class that implements {@link IClusterCheck}.
 *
 * Used by {@link ClusterCheckMetadata} to store registered classes and by the
 * DI container to instantiate them. Works with the `@ClusterCheck()` decorator.
 *
 * @example
 * ```typescript
 * import { Container } from '@n8n/di';
 * import type { ClusterCheckClass } from '@n8n/decorators';
 *
 * const CheckClass: ClusterCheckClass = VersionMismatchCheck;
 * const instance = Container.get(CheckClass);
 * ```
 */
export type ClusterCheckClass = Constructable<IClusterCheck>;
