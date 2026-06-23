import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

export type PromotionRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Tells the consuming instance how to fetch a deployable's bytes. For the v1
 * direct transport the consuming instance already knows the producing base URL
 * (from its source connection), so the locator only carries the transport kind
 * and the content hash. Intermediary transports (shared store / git) would add
 * their own locator variants — this is the seam that keeps that an adapter.
 */
export type DeployableLocator = {
	type: 'direct';
	deployableHash: string;
};

/** A promotion request as held by the producing instance (its system of record). */
export interface ProducingPromotionRequest {
	id: string;
	title: string;
	targetEnv: string;
	deployableHash: string;
	locator: DeployableLocator;
	createdAt: string;
	createdBy: string;
	status: PromotionRequestStatus;
}

/** The frozen deployable + its parsed manifest, kept in memory on the producing side. */
export interface StoredDeployable {
	hash: string;
	manifest: PackageManifest;
	buffer: Buffer;
	createdAt: string;
}

/**
 * What `GET /outbox` returns per request: intent + manifest only (workflow names,
 * credential requirements), never the workflow artifact bytes. Enough for the
 * consuming staging area to show credential gaps without a heavy transfer.
 */
export interface OutboxEntry {
	request: ProducingPromotionRequest;
	manifest: PackageManifest;
}
