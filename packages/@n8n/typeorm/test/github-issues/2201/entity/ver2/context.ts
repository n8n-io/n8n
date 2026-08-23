import { Column, PrimaryColumn, ManyToOne } from '../../../../../src/index';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';

import { User } from './user';
import { Record } from './record';

@Entity({ name: 'record_contexts' })
export class RecordContext extends BaseEntity {
	@PrimaryColumn()
	recordId: string;

	@PrimaryColumn()
	userId: string;

	@ManyToOne(
		(type) => Record,
		(record) => record.contexts,
	)
	public readonly record: Record;

	@ManyToOne(
		(type) => User,
		(user) => user.contexts,
	)
	public readonly user: User;

	@Column()
	public readonly meta: string;
}
