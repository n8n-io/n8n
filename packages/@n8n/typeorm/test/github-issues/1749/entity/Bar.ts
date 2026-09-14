import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src';

@Entity('bar', { schema: 'foo' })
export class Bar {
	@PrimaryGeneratedColumn()
	id: string;
}
