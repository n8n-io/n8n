import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Generated } from '../../../../../src/decorator/Generated';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	@Generated('uuid')
	uuid: string;
}
