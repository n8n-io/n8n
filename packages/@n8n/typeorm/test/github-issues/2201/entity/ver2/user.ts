import { PrimaryColumn, OneToMany } from '../../../../../src/index';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';

import { RecordContext } from './context';

@Entity({ name: 'users' })
export class User extends BaseEntity {
	@PrimaryColumn()
	public id: string;

	@OneToMany(
		(type) => RecordContext,
		(context) => context.user,
	)
	public contexts: RecordContext[];
}
