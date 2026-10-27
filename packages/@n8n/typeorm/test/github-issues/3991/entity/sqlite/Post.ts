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

	@Column({ default: () => 'CURRENT_DATE' })
	col1: Date;

	@Column({ default: () => 'CURRENT_TIME' })
	col2: Date;

	@Column({ default: () => 'CURRENT_TIMESTAMP' })
	col3: Date;

	@Column({ precision: 3, default: () => 'CURRENT_TIMESTAMP' })
	col4: Date;

	@Column({ default: () => 'NOW()' })
	col5: Date;

	@CreateDateColumn({ default: () => 'CURRENT_DATE' })
	col6: Date;

	@CreateDateColumn({ default: () => 'CURRENT_TIME' })
	col7: Date;

	@CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
	col8: Date;

	@CreateDateColumn({ precision: 3, default: () => 'CURRENT_TIMESTAMP' })
	col9: Date;

	@CreateDateColumn({ default: () => 'NOW()' })
	col10: Date;

	@UpdateDateColumn({ default: () => 'CURRENT_DATE' })
	col11: Date;

	@UpdateDateColumn({ default: () => 'CURRENT_TIME' })
	col12: Date;

	@UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
	col13: Date;

	@UpdateDateColumn({ precision: 3, default: () => 'CURRENT_TIMESTAMP' })
	col14: Date;

	@UpdateDateColumn({ default: () => 'NOW()' })
	col15: Date;
}
