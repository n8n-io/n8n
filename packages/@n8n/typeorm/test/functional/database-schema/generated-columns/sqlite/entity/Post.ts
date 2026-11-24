import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	useTitle: boolean;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	@Column({
		asExpression: `"firstName" || ' ' || "lastName"`,
	})
	virtualFullName: string;

	@Column({
		asExpression: `"firstName" || ' ' || "lastName"`,
		generatedType: 'STORED',
	})
	storedFullName: string;

	@Column({
		asExpression: `"firstName" || "lastName"`,
		generatedType: 'STORED',
	})
	name: string;
}
