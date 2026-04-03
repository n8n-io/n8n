import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_version_history' })
export class InstanceVersionHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	major: number;

	@Column({ type: 'int' })
	minor: number;

	@Column({ type: 'int' })
	patch: number;
}
