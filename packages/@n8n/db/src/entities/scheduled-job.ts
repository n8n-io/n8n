import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';
import type { ScheduledTask } from './scheduled-task';

export type ScheduledJobRecurrence =
	| { activated: false }
	| {
			activated: true;
			index: number;
			intervalSize: number;
			typeInterval: 'hours' | 'days' | 'weeks' | 'months';
	  };

@Entity({ name: 'scheduled_job' })
@Index(['workflowId', 'nodeId'])
@Index(['enabled', 'nextRunAt'])
@Index(['workflowId', 'nodeId', 'ruleIndex'], { unique: true })
export class ScheduledJob extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 64 })
	nodeId: string;

	@Column()
	ruleIndex: number;

	@Column({ type: 'varchar', length: 255 })
	cronExpression: string;

	@Column({ type: 'varchar', length: 64 })
	timezone: string;

	@JsonColumn({ nullable: true })
	recurrence: ScheduledJobRecurrence | null;

	@Column({ type: 'int', nullable: true })
	recurrenceLastValue: number | null;

	@Column({ default: false })
	enabled: boolean;

	@DateTimeColumn({ nullable: true })
	nextRunAt: Date | null;

	@DateTimeColumn({ nullable: true })
	lastFiredAt: Date | null;

	@OneToMany('ScheduledTask', 'job')
	tasks: Array<Relation<ScheduledTask>>;
}
