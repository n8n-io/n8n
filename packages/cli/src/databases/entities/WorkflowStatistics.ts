/* eslint-disable import/no-cycle */
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import * as config from '../../../config';
import { DatabaseType } from '../..';
import { WorkflowEntity } from './WorkflowEntity';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getTimestampSyntax() {
	const dbType = config.getEnv('database.type');

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
export class WorkflowStatistics {
	@Column()
	count: number;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	latestEvent: Date;

	@PrimaryColumn({ length: 128 })
	name: string;

	@PrimaryColumn()
	@ManyToOne(() => WorkflowEntity, (workflowEntity: WorkflowEntity) => workflowEntity.statistics)
	@JoinColumn({ name: 'workflow', referencedColumnName: 'id' })
	workflow: WorkflowEntity;
}
