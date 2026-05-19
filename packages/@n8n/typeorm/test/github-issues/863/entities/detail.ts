import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Index } from '../../../../src/decorator/Index';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';

import { Master } from './master';

@Entity()
@Index('IDX_UNQ_MasterId', (type) => [type.masterId], { unique: true })
export class Detail {
	@PrimaryColumn({
		length: 20,
	})
	id: string;

	@Column({
		nullable: false,
		length: 20,
	})
	masterId: string;

	@ManyToOne(
		(type) => Master,
		(master) => master.details,
		{
			nullable: false,
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({
		name: 'masterId',
	})
	master: Master;
}
