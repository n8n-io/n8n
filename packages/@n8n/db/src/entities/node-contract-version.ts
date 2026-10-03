import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithCreatedAt } from './abstract-entity';

export const nodeContractVersionKinds = ['action', 'trigger', 'provider', 'credential'] as const;

export type NodeContractVersionKind = (typeof nodeContractVersionKinds)[number];

/** Who vouches for a version. It decides only whether the bundle runs in the sandbox. */
export type NodeContractOrigin = 'first-party' | 'community' | 'private';

/** A publisher signature of the manifest bytes. */
export interface NodeContractSignature {
	/** `sha256:<hex>` of the SPKI DER of the publisher key. */
	key: string;
	/** The base64 ed25519 signature. */
	sig: string;
}

/**
 * One version in the node contracts store of the instance. Every main and worker reads the
 * same rows. A row is never changed: one manifest digest has one set of bytes.
 */
@Entity({ name: 'node_contract_version' })
@Index(['contractId', 'version'], { unique: true })
export class NodeContractVersion extends WithCreatedAt {
	/** `sha256:<hex>` of `manifest`. */
	@PrimaryColumn({ type: 'varchar', length: 71 })
	digest: string;

	@Column({ type: 'varchar', length: 255 })
	contractId: string;

	@Column({ type: 'varchar', length: 32 })
	version: string;

	@Column({ type: 'varchar', length: 16 })
	kind: NodeContractVersionKind;

	/** The exact manifest bytes. Signatures and the digest cover these bytes. */
	@Column('text')
	manifest: string;

	@Column({ type: 'text', nullable: true })
	bundle: string | null;

	@Column({ type: 'text', nullable: true })
	fixtures: string | null;

	@JsonColumn()
	signatures: NodeContractSignature[];

	@DateTimeColumn({ nullable: true })
	published: Date | null;

	/** The origin that the store took from the signing key when it added the version. */
	@Column({ type: 'varchar', length: 16 })
	origin: NodeContractOrigin;
}

/**
 * One status line of the node contracts store: a yank, a revoke or a deprecation of a version.
 * It can be of a version that n8n ships, so it has no relation to `node_contract_version`. A row
 * is never changed.
 */
@Entity({ name: 'node_contract_status' })
@Index(['contractId'])
export class NodeContractStatus extends WithCreatedAt {
	/** `sha256:<hex>` of `line`. */
	@PrimaryColumn({ type: 'varchar', length: 71 })
	digest: string;

	@Column({ type: 'varchar', length: 255 })
	contractId: string;

	/** The exact JSON line. Its signatures cover the canonical form of the other fields. */
	@Column('text')
	line: string;
}
