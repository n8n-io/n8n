import { TableInheritance, Column, Entity } from '../../../../src';

import { BaseEntity } from './BaseEntity';

@Entity()
@TableInheritance({ column: { type: String, name: 'type' } })
export class Role extends BaseEntity {
	@Column()
	name: string;

	@Column()
	description: string;
}
