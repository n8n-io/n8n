import { Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { dbType } from './abstract-entity';

@Entity()
@Index(['userId', 'executionDate'])
@Index(['workflowId', 'userId', 'executionDate'], { unique: true })
export class UsageEntity {
	@PrimaryGeneratedColumn()
	usageId: number;

	@Column()
	workflowId: string;

	@Column()
	userId: string;

	@Column({ type: 'date' })
	executionDate: Date;

	@Column({ type: 'bigint', default: 0 })
	tokensConsumed: number;

	@Column({
		type: dbType === 'sqlite' ? 'real' : 'decimal',
		precision: 20,
		scale: 10,
		default: 0,
	})
	costIncurred: number;
}
