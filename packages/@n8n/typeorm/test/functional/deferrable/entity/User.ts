import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Company } from './Company';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Company,
		(company) => company.id,
		{
			deferrable: 'INITIALLY DEFERRED',
		},
	)
	company: Company;
}
