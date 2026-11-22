import type { CustomNodeAuth } from '@n8n/api-types';
import { BinaryColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export interface BaseUrlHistoryEntry {
	baseUrl: string;
	/** ISO 8601 time of the change. */
	changedAt: string;
	changedById: string | null;
}

export type CustomNodeIconMimeType = 'image/png' | 'image/svg+xml';

@Entity({ name: 'custom_node' })
@Index(['createdById'])
@Index(['updatedById'])
export class CustomNodeEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	displayName: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'text' })
	baseUrl: string;

	@JsonColumn({ default: '[]' })
	baseUrlHistory: BaseUrlHistoryEntry[];

	@JsonColumn()
	auth: CustomNodeAuth;

	@Column({ type: 'varchar', length: 32, nullable: true })
	iconMimeType: CustomNodeIconMimeType | null;

	/** Not selected by default because it can be large. Only `findIcon` reads it. */
	@BinaryColumn({ nullable: true, select: false })
	iconData?: Buffer | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
