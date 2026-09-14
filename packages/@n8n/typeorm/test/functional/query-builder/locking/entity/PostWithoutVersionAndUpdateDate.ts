import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity('post_without_v_ud')
export class PostWithoutVersionAndUpdateDate {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;
}
