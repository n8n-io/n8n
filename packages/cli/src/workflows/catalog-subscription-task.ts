import type { ClaimedTask } from '@n8n/scheduler';

/** Task type a catalog subscription's jobs are materialized under. */
export const CATALOG_SUBSCRIPTION_TASK_TYPE = 'workflow:catalog-subscription';

/**
 * What a subscription's job carries to its handler.
 *
 * Deliberately just the id: everything else about the subscription — the
 * inputs, whether it is still enabled, whether consent still stands — can have
 * changed since the job was provisioned, so the handler reads the row rather
 * than trusting a snapshot the payload froze.
 */
export interface CatalogSubscriptionTaskPayload {
	subscriptionId: string;
}

export const isCatalogSubscriptionTaskPayload = (
	payload: Record<string, unknown>,
): payload is Record<string, unknown> & CatalogSubscriptionTaskPayload =>
	typeof payload.subscriptionId === 'string' && payload.subscriptionId !== '';

/**
 * One occurrence's identity, so a redelivered task recognises the execution a
 * previous delivery already created instead of running the workflow twice.
 */
export const catalogSubscriptionDeduplicationKey = ({
	jobId,
	scheduledFor,
}: Pick<ClaimedTask, 'jobId' | 'scheduledFor'>): string => `${jobId}:${scheduledFor.toISOString()}`;
