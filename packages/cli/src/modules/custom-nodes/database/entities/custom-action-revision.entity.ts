import { JsonColumn, WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

import type { StoredRequest } from '../../edit-classifier';

@Entity({ name: 'custom_action_revision' })
@Index(['versionId', 'revision'], { unique: true })
@Index(['createdById'])
export class CustomActionRevisionEntity extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	versionId: number;

	@Column({ type: 'int' })
	revision: number;

	@JsonColumn()
	request: StoredRequest;

	@Column({ type: 'text', nullable: true })
	changeNote: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
