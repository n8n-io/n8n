import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { BasePost } from './BasePost';

@Entity()
export class Post extends BasePost {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ default: false })
	active: boolean;
}
