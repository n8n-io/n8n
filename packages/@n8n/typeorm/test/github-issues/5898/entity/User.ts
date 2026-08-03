import { Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Document } from './Document';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@OneToMany(
		() => Document,
		(doc) => doc.owner,
		{ onDelete: 'CASCADE' },
	)
	docs: Document[];
}
