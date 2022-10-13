/* eslint-disable import/no-cycle */
import { Column, Entity, RelationId, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
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

export enum StatisticsNames {
	productionSuccess = 'production_success',
	productionError = 'production_error',
	manualSuccess = 'manual_success',
	manualError = 'manual_error',
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
	name: StatisticsNames;

	@ManyToOne(() => WorkflowEntity, (workflow) => workflow.shared, {
		primary: true,
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@RelationId((workflowStatistics: WorkflowStatistics) => workflowStatistics.workflow)
	@PrimaryColumn()
	workflowId: number;
}
