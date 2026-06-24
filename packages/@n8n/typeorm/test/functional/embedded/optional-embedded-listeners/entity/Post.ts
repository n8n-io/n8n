import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PostInformation } from './PostInformation';
import { Index } from '../../../../../src/decorator/Index';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	@Index()
	title: string;

	@Column()
	text: string;

	@Column((type) => PostInformation, { prefix: 'info' })
	information?: PostInformation;
}
