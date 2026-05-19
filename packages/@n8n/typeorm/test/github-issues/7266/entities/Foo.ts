import { PrimaryGeneratedColumn, UpdateDateColumn } from '../../../../src';

import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity('foo')
export class Foo {
	@PrimaryGeneratedColumn({ name: 'id' })
	id: number;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
