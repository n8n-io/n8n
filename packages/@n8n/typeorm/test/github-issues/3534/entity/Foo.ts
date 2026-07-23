import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { RegExpStringTransformer } from './RegExpStringTransformer';
import { PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: String, transformer: RegExpStringTransformer })
	bar: RegExp;
}
