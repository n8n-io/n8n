import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import { z } from 'zod';

import { BinaryColumn, WithTimestamps } from './abstract-entity';

// The DB CHECK constraint still allows 'agent_file': agent knowledge files moved
// to blob storage, but legacy rows from that era are kept, so it cannot be narrowed.
export const SourceTypeSchema = z.enum(['execution', 'chat_message_attachment']);

export type SourceType = z.infer<typeof SourceTypeSchema>;

@Entity('binary_data')
export class BinaryDataFile extends WithTimestamps {
	@PrimaryColumn('uuid')
	fileId: string;

	@Column('varchar', { length: 50 })
	sourceType: SourceType;

	@Column('varchar', { length: 255 })
	sourceId: string;

	@BinaryColumn()
	data: Buffer;

	@Column('varchar', { length: 255, nullable: true })
	mimeType: string | null;

	@Column('varchar', { length: 255, nullable: true })
	fileName: string | null;

	@Column('int')
	fileSize: number; // bytes
}

Index(['sourceType', 'sourceId'])(BinaryDataFile);
