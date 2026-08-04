import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class Document {
	@PrimaryColumn('text')
	id: string;

	@Column('text')
	docId: string;

	@Column('text')
	label: string;

	@Column('text')
	context: string;

	@Column({ type: 'jsonb' })
	distributions: Distribution[];

	@Column({ type: 'timestamp with time zone' })
	date: Date;
}

export interface Distribution {
	weight: string;
	id: number;
	docId: number;
}
