import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Column, PrimaryColumn, ManyToOne } from '../../../../../src/index';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';

import { User } from './user';
import { Record } from './record';

@Entity({ name: 'record_contexts' })
export class RecordContext extends BaseEntity {
	@PrimaryColumn({ name: 'record_id' })
	recordId: string;

	@PrimaryColumn({ name: 'user_id' })
	userId: string;

	@ManyToOne(
		(type) => Record,
		(record) => record.contexts,
	)
	@JoinColumn({ name: 'record_id' })
	public readonly record: Record;

	@ManyToOne(
		(type) => User,
		(user) => user.contexts,
	)
	@JoinColumn({ name: 'user_id' })
	public readonly user: User;

	@Column()
	public readonly meta: string;
}
