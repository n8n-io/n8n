import { Entity, PrimaryGeneratedColumn } from '../../../../src';
import { FruitEnum } from '../enum/FruitEnum';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('enum', { enum: FruitEnum, default: FruitEnum.Apple })
	fruit: FruitEnum;
}
