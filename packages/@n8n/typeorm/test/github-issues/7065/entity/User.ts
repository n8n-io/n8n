import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Email } from './Email';
import { Phone } from './Phone';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => Email,
		(email) => email.user,
		{ cascade: true },
	)
	emails: Email[];

	@OneToMany(
		() => Phone,
		(phone) => phone.user,
		{ cascade: true },
	)
	phones: Phone[];
}
