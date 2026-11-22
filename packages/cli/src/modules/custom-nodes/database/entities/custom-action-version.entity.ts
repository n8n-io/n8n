import { JsonColumn, WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import type { StoredInput } from '../../edit-classifier';

@Entity({ name: 'custom_action_version' })
@Index(['actionId', 'version'], { unique: true })
export class CustomActionVersionEntity extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	actionId: string;

	@Column({ type: 'int' })
	version: number;

	@JsonColumn()
	inputs: StoredInput[];

	@Column({ type: 'int' })
	currentRevision: number;
}
