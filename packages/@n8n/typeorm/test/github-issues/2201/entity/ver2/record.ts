import { PrimaryColumn, Column, OneToMany } from '../../../../../src/index';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';

import { RecordContext } from './context';

@Entity({ name: 'records' })
export class Record extends BaseEntity {
	@PrimaryColumn()
	public id: string;

	@OneToMany(
		(type) => RecordContext,
		(context) => context.record,
	)
	public contexts: RecordContext[];

	@Column()
	public status: 'pending' | 'failed' | 'done';
}
