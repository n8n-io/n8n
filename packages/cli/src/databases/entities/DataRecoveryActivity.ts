import { Column, Entity } from 'typeorm';
import { SyncStatus } from '@deep-consulting-solutions/incident-handling';

import GenericEntity from './GenericEntity';

@Entity()
export class DataRecoveryActivity extends GenericEntity {
	@Column({ type: 'timestamptz', nullable: false })
	syncFrom: Date;

	@Column('text', { array: true, default: {} })
	modules: string[];

	@Column('enum', {
		enum: SyncStatus,
		nullable: false,
		default: SyncStatus.PROGRESSING,
	})
	status: SyncStatus;

	@Column({ type: 'text', nullable: true })
	failureReason?: string;
}
