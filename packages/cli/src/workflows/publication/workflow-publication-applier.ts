import { Logger } from '@n8n/backend-common';
import {
	WorkflowEntity,
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowPublicationOutbox,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import type { PublicationResult } from '@/workflows/publication/publication-result';
import { computeTriggerDiff } from '@/workflows/publication/trigger-diff';
import { isTransientActivationError } from '@/workflows/triggers/trigger-activation-retry';
import {
	WorkflowTriggerActivator,
	type TriggerActivationFailure,
	type TriggerActivationOutcome,
} from '@/workflows/triggers/workflow-trigger-activator';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

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
	async apply(record: WorkflowPublicationOutbox): Promise<PublicationResult> {
		const { workflow, oldVersion, newVersion } = await this.resolveVersions(record);

		if (!workflow) return { type: 'skipped', reason: 'workflow-not-found' };

		// `activeVersionId` is the source of truth for activity; `active` is deprecated.
		// A null `activeVersionId` means the workflow has been unpublished, so we
		// reconcile its triggers down to nothing rather than to a target version.
		if (workflow.activeVersionId === null) {
			return await this.unpublish(workflow, oldVersion, record);
		}

		if (!newVersion) return { type: 'version-missing' };

		return await this.publish(workflow, oldVersion, newVersion, record);
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
	): Promise<PublicationResult> {
		const oldTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(oldVersion);
		const desiredTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(newVersion);

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
			return { type: 'completed' };
		}

		// Must happen BEFORE advancing the version, using the currently published
		// version so the right webhooks are deregistered. A teardown failure here
		// bubbles up so the version is not advanced.
		if (toRemove.size > 0 && oldVersion) {
			await this.workflowTriggerActivator.deactivate(workflow, oldVersion, toRemove);
		}

		await this.advancePublishedVersion(record);

		try {
			if (toAdd.size > 0) {
				const outcome = await this.workflowTriggerActivator.activate(workflow, newVersion, toAdd);
				return this.classifyActivationOutcome(outcome);
			}

			if (toRemove.size > 0) {
				await this.workflowTriggerActivator.updateTriggerCount(workflow, newVersion);
			}
		} catch (e) {
			return { type: 'failed', error: ensureError(e) };
		}

		return { type: 'completed' };
	}

	/**
	 * Unpublishes a workflow by tearing down the triggers of its currently
	 * published version and removing the `workflow_published_version` mapping. The
	 * version to deactivate comes from the mapping (`oldVersion`), since the
	 * workflow's `activeVersionId` has already been cleared by the service that
	 * enqueued this record. A missing mapping means nothing was published on this
	 * leader, so there is nothing to tear down.
	 *
	 * A teardown failure bubbles up (the consumer turns it into a `failed` result)
	 * so the mapping is only removed once teardown has succeeded.
	 */
	private async unpublish(
		workflow: WorkflowEntity,
		oldVersion: WorkflowHistory | null,
		record: WorkflowPublicationOutbox,
	): Promise<PublicationResult> {
		if (!oldVersion) return { type: 'skipped', reason: 'workflow-inactive' };

		const toRemove = new Set(
			this.workflowTriggerActivator.getEnabledTriggerNodes(oldVersion).map((node) => node.id),
		);

		if (toRemove.size > 0) {
			await this.workflowTriggerActivator.deactivate(workflow, oldVersion, toRemove);
		}

		// Invalidate before the mapping is removed, so reads fall through to the
		// database instead of the cache ever serving a version for an unpublished
		// workflow. No repopulation follows: the end state has no published version.
		await this.workflowPublishedDataService.invalidateCache(record.workflowId);
		await this.workflowPublishedVersionRepository.removePublishedVersion(record.workflowId);

		return { type: 'unpublished' };
	}

	/**
	 * Maps a per-node activation outcomes to a combined publication result.
	 */
	private classifyActivationOutcome(outcome: TriggerActivationOutcome): PublicationResult {
		if (outcome.failures.length === 0) return { type: 'completed' };

		const allDeterministic = outcome.failures.every(
			(failure) => !isTransientActivationError(failure.error),
		);
		if (outcome.activated.length === 0 && allDeterministic) {
			return { type: 'failed', error: this.toActivationError(outcome.failures) };
		}

		return {
			type: 'partial',
			activatedNodeIds: outcome.activated,
			failures: outcome.failures,
		};
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
