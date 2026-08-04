import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { FooMetadata } from './FooMetadata';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column((type) => FooMetadata)
	metadata?: FooMetadata;
}
