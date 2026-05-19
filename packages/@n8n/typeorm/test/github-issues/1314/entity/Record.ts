import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

/**
 * For testing Postgres jsonb
 */
@Entity()
export class Record {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'json', nullable: true })
	config: any;

	@Column({ type: 'jsonb', nullable: true })
	data: any;
}
