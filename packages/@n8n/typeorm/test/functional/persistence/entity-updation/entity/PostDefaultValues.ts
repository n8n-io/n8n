import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class PostDefaultValues {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ default: 'hello post' })
	text: string;

	@Column({ default: true })
	isActive: boolean;

	@Column({ default: () => 'CURRENT_TIMESTAMP' })
	addDate: Date;

	@Column({ default: 0 })
	views: number;

	@Column({ nullable: true })
	description: string;
}
