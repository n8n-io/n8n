import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Unique } from '../../../../src/decorator/Unique';
import { Company } from './Company';

@Entity()
@Unique(['name'], { deferrable: 'INITIALLY IMMEDIATE' })
export class Office {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Company,
		(company) => company.id,
		{
			deferrable: 'INITIALLY IMMEDIATE',
		},
	)
	company: Company;
}
