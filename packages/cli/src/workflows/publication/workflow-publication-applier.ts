import { Logger } from '@n8n/backend-common';
import {
	WorkflowEntity,
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowPublicationOutbox,
	WorkflowPublicationReason,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	type WorkflowPublicationTriggerKind,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { INode, WorkflowActivateMode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { healNodeIds } from '@/workflows/publication/heal-node-ids';
import type {
	PublicationResult,
	TriggerPublicationStatus,
} from '@/workflows/publication/publication-result';
import { computeTriggerDiff } from '@/workflows/publication/trigger-diff';
import { isTriggerLikeNodeType } from '@/workflows/triggers/enabled-trigger-nodes';
import { WorkflowService } from '@/workflows/workflow.service';
import {
	WorkflowTriggerActivator,
	type TriggerActivationFailure,
	type TriggerActivationOutcome,
	type TriggerOperationAbort,
} from '@/workflows/triggers/workflow-trigger-activator';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

/**
 * The activation mode reported to trigger nodes for each enqueue reason, so
 * e.g. the n8n Trigger's "Instance Started" event fires exactly for the
 * leader's startup pass. Records from before the `reason` column existed
 * default to `publish` at the DB level, i.e. today's `update` behavior.
 * A first publication overrides `publish` → `activate`; see
 * {@link WorkflowPublicationApplier.resolveActivationMode}.
 */
const ACTIVATION_MODE_BY_REASON: Record<WorkflowPublicationReason, WorkflowActivateMode> = {
	[WorkflowPublicationReason.Publish]: 'update',
	[WorkflowPublicationReason.Startup]: 'init',
	[WorkflowPublicationReason.LeadershipTakeover]: 'leadershipChange',
	[WorkflowPublicationReason.Reconcile]: 'update',
};

/**
 * Reconciles a workflow's triggers to a published version, one outbox record at
 * a time. This is the only class that knows the remove → advance published
 * version → add ordering invariant, and the only one that touches
 * `workflow_published_version`. It writes no outbox statuses; instead each
 * {@link WorkflowPublicationApplier.apply} call returns a
 * {@link PublicationResult} for {@link PublicationStatusReporter} to turn into
 * terminal state.
 */
@Service()
export class WorkflowPublicationApplier {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowTriggerActivator: WorkflowTriggerActivator,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowService: WorkflowService,
		private readonly telemetry: Telemetry,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Applies a single publication outbox record, dispatching to {@link publish}
	 * (reconcile triggers to the requested version) or {@link unpublish} (tear the
	 * published triggers down) based on the workflow's current state.
	 *
	 * The caller must uphold these invariants for `apply` to behave correctly:
	 *
	 * - **Serialized per workflow.** Two concurrent `apply` calls for the same
	 *   workflow would race on the published version and on trigger registration,
	 *   leaving the in-memory triggers inconsistent with `workflow_published_version`.
	 *   The outbox claim guarantees this: a workflow with an in-progress record is
	 *   never claimed again, and records are processed in FIFO (enqueue) order.
	 * - **Runs on the instance that owns trigger execution (the leader).**
	 *   (De)activation mutates in-memory webhook/poll registrations, so it must run
	 *   where those triggers actually fire. The consumer only polls on the leader.
	 * - **The currently registered triggers match the published version.** The diff
	 *   is computed against `oldVersion` (= the row in `workflow_published_version`)
	 *   and the remove step deregisters from it, so the triggers running in memory
	 *   must correspond to that version; otherwise the wrong triggers are
	 *   (de)registered.
	 */
	async apply(
		record: WorkflowPublicationOutbox,
		abort: TriggerOperationAbort,
	): Promise<PublicationResult> {
		const { workflow, oldVersion, newVersion } = await this.resolveVersions(record);

		if (!workflow) return { type: 'skipped', reason: 'workflow-not-found' };

		// `activeVersionId` is the source of truth for activity; `active` is deprecated.
		// A null `activeVersionId` means the workflow has been unpublished, so we
		// reconcile its triggers down to nothing rather than to a target version.
		if (workflow.activeVersionId === null) {
			return await this.unpublish(workflow, oldVersion, record, abort);
		}

		if (!newVersion) return { type: 'version-missing' };

		return await this.publish(workflow, oldVersion, newVersion, record, abort);
	}

	/**
	 * Publishes `newVersion`: computes a trigger-level diff between the currently
	 * published version and the requested version, augments it with any desired
	 * non-webhook trigger that is missing locally, and applies only the necessary
	 * operations — removing deleted triggers, adding new ones, and re-applying
	 * modified ones (remove-then-add) while leaving unchanged triggers running. The
	 * published version is advanced between the remove and add steps.
	 */
	private async publish(
		workflow: WorkflowEntity,
		oldVersion: WorkflowHistory | null,
		newVersion: WorkflowHistory,
		record: WorkflowPublicationOutbox,
		abort: TriggerOperationAbort,
	): Promise<PublicationResult> {
		const healSkip = await this.healBrokenNodeIds(workflow, newVersion);
		if (healSkip !== null) return healSkip;

		const oldTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(oldVersion);
		const desiredTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(newVersion);
		const triggerKinds = this.workflowTriggerActivator.getTriggerKinds(desiredTriggerNodes);

		const { toAdd, toRemove } = computeTriggerDiff(oldTriggerNodes, desiredTriggerNodes);

		this.logger.debug(
			`Calculated trigger diff for workflow publication: ${toAdd.size} to add, ${toRemove.size} to remove`,
			{
				workflowId: record.workflowId,
				publishedVersionId: record.publishedVersionId,
				toAdd: Array.from(toAdd),
				toRemove: Array.from(toRemove),
			},
		);

		// We also register triggers that are in our desired state that aren't
		// present locally, even if they aren't in this version diff. This is
		// necessary for startup/retry/crash recovery.
		this.workflowTriggerActivator
			.getUnregisteredNonWebhookTriggerNodeIds(record.workflowId, desiredTriggerNodes)
			.forEach((nodeId) => toAdd.add(nodeId));

		// Webhook triggers live in the `webhook_entity` table, so reconcile them
		// against that stored state the same way: re-add any desired webhook node
		// whose webhooks aren't all registered locally.
		const nodesWithUnregisteredWebhooks =
			await this.workflowTriggerActivator.getNodesWithUnregisteredWebhooks(workflow, newVersion);
		nodesWithUnregisteredWebhooks.forEach((nodeId) => toAdd.add(nodeId));

		// No trigger changed: advance the published version and finish. Unchanged
		// triggers keep running and re-read the new version on their next fire.
		if (toAdd.size === 0 && toRemove.size === 0) {
			await this.advancePublishedVersion(record);
			return {
				type: 'completed',
				triggerStatuses: this.buildTriggerStatuses(desiredTriggerNodes, triggerKinds, {
					activated: [],
					failures: [],
				}),
			};
		}

		// Abort only before the trigger (de)activation phases — those run node
		// code and can be slow; every state they leave behind on a mid-apply stop
		// is one a crashed leader could also leave, which retries already handle.
		abort.signal.throwIfAborted();

		// Must happen BEFORE advancing the version, using the currently published
		// version so the right webhooks are deregistered. A teardown failure here
		// bubbles up so the version is not advanced.
		if (toRemove.size > 0 && oldVersion) {
			await this.workflowTriggerActivator.deactivate(workflow, oldVersion, toRemove, abort);
		}

		await this.advancePublishedVersion(record);

		try {
			abort.signal.throwIfAborted();
			if (toAdd.size > 0) {
				const activationMode = this.resolveActivationMode(record, oldVersion);
				const outcome = await this.workflowTriggerActivator.activate(
					workflow,
					newVersion,
					toAdd,
					activationMode,
					abort,
				);
				return this.classifyActivationOutcome(outcome, desiredTriggerNodes, triggerKinds);
			}

			if (toRemove.size > 0) {
				await this.workflowTriggerActivator.updateTriggerCount(workflow, newVersion);
			}
		} catch (e) {
			return { type: 'failed', error: ensureError(e) };
		}

		return {
			type: 'completed',
			triggerStatuses: this.buildTriggerStatuses(desiredTriggerNodes, triggerKinds, {
				activated: [],
				failures: [],
			}),
		};
	}

	/**
	 * A first publication (no old version) reports `activate`, so the n8n Trigger's
	 * "Workflow Published" event fires; otherwise the mode follows the record's reason.
	 */
	private resolveActivationMode(
		record: WorkflowPublicationOutbox,
		oldVersion: WorkflowHistory | null,
	): WorkflowActivateMode {
		const reason = record.reason ?? WorkflowPublicationReason.Publish;
		if (reason === WorkflowPublicationReason.Publish && oldVersion === null) return 'activate';
		return ACTIVATION_MODE_BY_REASON[reason];
	}

	/**
	 * Unpublishes a workflow by tearing down the triggers of its currently
	 * published version and removing the `workflow_published_version` mapping. The
	 * version to deactivate comes from the mapping (`oldVersion`), since the
	 * workflow's `activeVersionId` has already been cleared by the service that
	 * enqueued this record.
	 *
	 * A missing mapping means nothing was published on this leader, so there is
	 * nothing to tear down. In that case the record still completes as a
	 * successful `unpublished` to support idempotent retries — the reporter then
	 * clears any trigger-status rows left behind by an interrupted unpublish.
	 *
	 * A teardown failure bubbles up (the consumer turns it into a `failed` result)
	 * so the mapping is only removed once teardown has succeeded.
	 */
	private async unpublish(
		workflow: WorkflowEntity,
		oldVersion: WorkflowHistory | null,
		record: WorkflowPublicationOutbox,
		abort: TriggerOperationAbort,
	): Promise<PublicationResult> {
		// If there is no oldVersion we may be retrying an unpublish that was
		// interrupted after removing the mapping: nothing to tear down, but we
		// still complete as `unpublished`.
		const toRemove = new Set(
			this.workflowTriggerActivator.getEnabledTriggerNodes(oldVersion).map((node) => node.id),
		);

		if (oldVersion && toRemove.size > 0) {
			abort.signal.throwIfAborted();
			await this.workflowTriggerActivator.deactivate(workflow, oldVersion, toRemove, abort);
		}

		// Invalidate before the mapping is removed, so reads fall through to the
		// database instead of the cache ever serving a version for an unpublished
		// workflow. No repopulation follows: the end state has no published version.
		await this.workflowPublishedDataService.invalidateCache(record.workflowId);
		await this.workflowPublishedVersionRepository.removePublishedVersion(record.workflowId);

		return { type: 'unpublished' };
	}

	/**
	 * Maps per-node activation outcomes to a combined publication result, attaching
	 * the full desired trigger set's statuses to every version-advancing result.
	 */
	private classifyActivationOutcome(
		outcome: TriggerActivationOutcome,
		desiredTriggerNodes: INode[],
		triggerKinds: Map<INode['id'], WorkflowPublicationTriggerKind>,
	): PublicationResult {
		const triggerStatuses = this.buildTriggerStatuses(desiredTriggerNodes, triggerKinds, outcome);
		if (outcome.failures.length === 0) return { type: 'completed', triggerStatuses };

		// Check whether this is a partial or full failure: If at least one trigger
		// has been activated successfully, it's partial.
		const hasRunningTrigger = triggerStatuses.some((s) => s.status === 'activated');
		if (!hasRunningTrigger) {
			return { type: 'failed', error: this.toActivationError(outcome.failures), triggerStatuses };
		}

		return { type: 'partial', triggerStatuses };
	}

	/**
	 * Builds per-trigger statuses for the full set of desired trigger nodes.
	 * Nodes in `outcome.failures` are marked `failed`; all others are `activated`,
	 * including unchanged-but-still-running triggers that were not in `toAdd`.
	 */
	private buildTriggerStatuses(
		desiredTriggerNodes: INode[],
		triggerKinds: Map<INode['id'], WorkflowPublicationTriggerKind>,
		outcome: TriggerActivationOutcome,
	): TriggerPublicationStatus[] {
		const failureByNodeId = new Map(outcome.failures.map((f) => [f.nodeId, f]));
		return desiredTriggerNodes.map((node): TriggerPublicationStatus => {
			// Every desired node is classified by `getTriggerKinds`; the fallback only
			// guards an unexpected miss, and 'persisted' is the safe one (the reconciler
			// ignores it) since a stray in-memory guess would re-enqueue forever.
			const triggerKind = triggerKinds.get(node.id) ?? 'persisted';
			const failure = failureByNodeId.get(node.id);
			return failure
				? {
						nodeId: node.id,
						nodeName: node.name,
						status: 'failed',
						triggerKind,
						errorMessage: failure.error.message,
					}
				: { nodeId: node.id, nodeName: node.name, status: 'activated', triggerKind };
		});
	}

	/**
	 * Combines multiple per trigger failures into a single error.
	 */
	private toActivationError(failures: TriggerActivationFailure[]): Error {
		if (failures.length === 1) return failures[0].error;

		const detail = failures
			.map((failure) => `"${failure.nodeName}": ${failure.error.message}`)
			.join('; ');

		return new Error(`Triggers failed to activate: ${detail}`);
	}

	/**
	 * Loads the workflow and the two versions whose triggers are diffed: the
	 * version being published (`newVersion`, null if its history row no longer
	 * exists) and the currently published version (`oldVersion`, null on a first
	 * publication). The workflow is loaded independently of the published-version
	 * mapping so a first publication (no mapping row yet) still resolves it.
	 */
	private async resolveVersions(record: WorkflowPublicationOutbox): Promise<{
		workflow: WorkflowEntity | null;
		oldVersion: WorkflowHistory | null;
		newVersion: WorkflowHistory | null;
	}> {
		const [workflow, currentlyPublishedVersion, newVersion] = await Promise.all([
			this.workflowRepository.findOneBy({ id: record.workflowId }),
			this.workflowPublishedVersionRepository.findOne({
				where: { workflowId: record.workflowId },
				relations: { publishedVersion: true },
				loadEagerRelations: false,
			}),
			this.workflowHistoryRepository.findOneBy({ versionId: record.publishedVersionId }),
		]);

		const oldVersion = currentlyPublishedVersion?.publishedVersion ?? null;

		return { workflow, oldVersion, newVersion };
	}

	/**
	 * Guards activation against a version whose nodes carry duplicate or missing
	 * ids — wild data predating id enforcement, or reimported around it. Applying
	 * such a version breaks everything keyed on `(workflowId, nodeId)`: its
	 * trigger-status rows collide on their primary key and durable poll cursors
	 * are shared between nodes. Instead, a corrected copy is published as a new
	 * system-authored version and this record is skipped; the publish enqueued
	 * the record that applies the healed version. Healing a healed version is a
	 * no-op, so this converges instead of publishing forever. A lost publish
	 * race (concurrent user publish, unpublish, or deletion) means something
	 * newer superseded this version, and its own record does the work.
	 */
	private async healBrokenNodeIds(
		workflow: WorkflowEntity,
		newVersion: WorkflowHistory,
	): Promise<PublicationResult | null> {
		const healed = healNodeIds(newVersion.nodes, {
			isTriggerLike: (node) => this.isTriggerLikeNode(node),
		});
		if (!healed.changed) return null;

		this.logger.warn(
			'Published version carries duplicate or missing node ids, publishing a healed version',
			{
				workflowId: workflow.id,
				versionId: newVersion.versionId,
				filled: healed.report.filled.length,
				reassigned: healed.report.reassigned.length,
				dropped: healed.report.dropped.length,
			},
		);

		// Baseline on the version the healed copy was derived from: if anything
		// newer was published while this record was in flight, the heal must lose.
		const published = await this.workflowService.publishAsSystem(
			workflow.id,
			{
				nodes: healed.nodes,
				connections: newVersion.connections,
				nodeGroups: newVersion.nodeGroups,
			},
			newVersion.versionId,
		);

		this.telemetry.track(TELEMETRY_EVENT.WORKFLOW.NODE_IDS_HEALED, {
			workflow_id: workflow.id,
			filled_count: healed.report.filled.length,
			reassigned_count: healed.report.reassigned.length,
			dropped_count: healed.report.dropped.length,
			superseded: !published.published,
		});

		return { type: 'skipped', reason: published.published ? 'node-ids-healed' : 'superseded' };
	}

	private isTriggerLikeNode(node: INode): boolean {
		try {
			return isTriggerLikeNodeType(this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion));
		} catch {
			// An unresolvable node type (e.g. an uninstalled community node) must not
			// block healing; the keeper preference falls back to the first sharer.
			return false;
		}
	}

	/**
	 * Advances the canonical version read by triggers. Runs before registering
	 * the new triggers so they execute the newly published version rather than
	 * the previous one.
	 */
	private async advancePublishedVersion(record: WorkflowPublicationOutbox) {
		// Invalidate → write → refresh: with the cache empty across the write, reads
		// fall through to the database (the source of truth) rather than ever serving
		// a stale version, before the new version is cached again.
		await this.workflowPublishedDataService.invalidateCache(record.workflowId);
		await this.workflowPublishedVersionRepository.setPublishedVersion(
			record.workflowId,
			record.publishedVersionId,
		);
		await this.workflowPublishedDataService.refreshCache(record.workflowId);
	}
}
