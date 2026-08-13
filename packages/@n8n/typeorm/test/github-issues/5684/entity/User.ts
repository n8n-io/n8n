import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Company } from './Company';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		() => Company,
		(company) => company.staff,
		{
			eager: true, // <- this cases the bug.
		},
	)
	@JoinColumn()
	company: Company;
}
