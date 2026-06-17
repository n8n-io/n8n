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
import {
	WorkflowTriggerActivator,
	type TriggerActivationOutcome,
} from '@/workflows/triggers/workflow-trigger-activator';

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
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowTriggerActivator: WorkflowTriggerActivator,
	) {}

	/**
	 * Reconciles the workflow's triggers to the version requested by `record`. It
	 * computes a trigger-level diff between the currently published version and the
	 * requested version, augments it with any desired non-webhook trigger that is
	 * missing locally, and applies only the necessary operations: removing deleted
	 * triggers, adding new ones, and re-applying modified ones (remove-then-add)
	 * while leaving unchanged triggers running. The published version is advanced
	 * between the remove and add steps.
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
		if (workflow.activeVersionId === null) {
			return { type: 'skipped', reason: 'workflow-inactive' };
		}

		if (!newVersion) return { type: 'version-missing' };

		const oldTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(oldVersion);
		const desiredTriggerNodes = this.workflowTriggerActivator.getEnabledTriggerNodes(newVersion);

		const { toAdd, toRemove } = computeTriggerDiff(oldTriggerNodes, desiredTriggerNodes);

		// We also register triggers that are in our desired state that aren't
		// present locally, even if they aren't in this version diff. This is
		// necessary for startup/retry/crash recovery.
		this.workflowTriggerActivator
			.getUnregisteredNonWebhookTriggerNodeIds(record.workflowId, desiredTriggerNodes)
			.forEach((nodeId) => toAdd.add(nodeId));

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
	 * Maps a per-node activation outcome to a publication result. With every node
	 * activated it is a full success. Any returned failure — including a webhook
	 * path conflict — leaves the surviving triggers running and is reported as
	 * `partial`: the new version stays published and re-publishing can recover it.
	 */
	private classifyActivationOutcome(outcome: TriggerActivationOutcome): PublicationResult {
		if (outcome.failures.length === 0) return { type: 'completed' };

		return {
			type: 'partial',
			activatedNodeIds: outcome.activated,
			failures: outcome.failures,
		};
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
		await this.workflowPublishedVersionRepository.setPublishedVersion(
			record.workflowId,
			record.publishedVersionId,
		);
	}
}
