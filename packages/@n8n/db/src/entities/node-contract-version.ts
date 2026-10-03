import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithCreatedAt } from './abstract-entity';

export const nodeContractVersionKinds = ['action', 'trigger', 'provider', 'credential'] as const;

export type NodeContractVersionKind = (typeof nodeContractVersionKinds)[number];

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
}
