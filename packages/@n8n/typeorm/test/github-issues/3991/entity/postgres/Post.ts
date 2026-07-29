import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'date', default: () => 'CURRENT_DATE' })
	col1: Date;

	@Column({ type: 'date', default: () => 'current_date' })
	col2: Date;

	@Column({ type: 'time', default: () => 'CURRENT_TIME' })
	col3: Date;

	@Column({ type: 'time', default: () => 'CURRENT_TIME(3)' })
	col4: Date;

	@Column({ type: 'time', default: () => 'current_time' })
	col5: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	col6: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(3)' })
	col7: Date;

	@Column({ type: 'timestamp', default: () => 'current_timestamp' })
	col8: Date;

	@Column({ type: 'timestamp', default: () => 'NOW()' })
	col9: Date;

	@Column({ type: 'time', default: () => 'LOCALTIME' })
	col10: Date;

	@Column({ type: 'time', default: () => 'LOCALTIME(3)' })
	col11: Date;

	@Column({ type: 'time', default: () => 'localtime' })
	col12: Date;

	@Column({ type: 'timestamp', default: () => 'LOCALTIMESTAMP' })
	col13: Date;

	@Column({ type: 'timestamp', default: () => 'LOCALTIMESTAMP(3)' })
	col14: Date;

	@Column({ type: 'timestamp', default: () => 'localtimestamp' })
	col15: Date;

	@CreateDateColumn({ type: 'date', default: () => 'CURRENT_DATE' })
	col16: Date;

	@CreateDateColumn({ type: 'date', default: () => 'current_date' })
	col17: Date;

	@CreateDateColumn({ type: 'time', default: () => 'CURRENT_TIME' })
	col18: Date;

	@CreateDateColumn({ type: 'time', default: () => 'CURRENT_TIME(3)' })
	col19: Date;

	@CreateDateColumn({ type: 'time', default: () => 'current_time' })
	col20: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	col21: Date;

	@CreateDateColumn({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP(3)',
	})
	col22: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'current_timestamp' })
	col23: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
	col24: Date;

	@CreateDateColumn({ type: 'time', default: () => 'LOCALTIME' })
	col25: Date;

	@CreateDateColumn({ type: 'time', default: () => 'LOCALTIME(3)' })
	col26: Date;

	@CreateDateColumn({ type: 'time', default: () => 'localtime' })
	col27: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'LOCALTIMESTAMP' })
	col28: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'LOCALTIMESTAMP(3)' })
	col29: Date;

	@CreateDateColumn({ type: 'timestamp', default: () => 'localtimestamp' })
	col30: Date;

	@UpdateDateColumn({ type: 'date', default: () => 'CURRENT_DATE' })
	col31: Date;

	@UpdateDateColumn({ type: 'date', default: () => 'current_date' })
	col32: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'CURRENT_TIME' })
	col33: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'CURRENT_TIME(3)' })
	col34: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'current_time' })
	col35: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	col36: Date;

	@UpdateDateColumn({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP(3)',
	})
	col37: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'current_timestamp' })
	col38: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
	col39: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'LOCALTIME' })
	col40: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'LOCALTIME(3)' })
	col41: Date;

	@UpdateDateColumn({ type: 'time', default: () => 'localtime' })
	col42: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'LOCALTIMESTAMP' })
	col43: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'LOCALTIMESTAMP(3)' })
	col44: Date;

	@UpdateDateColumn({ type: 'timestamp', default: () => 'localtimestamp' })
	col45: Date;
}
