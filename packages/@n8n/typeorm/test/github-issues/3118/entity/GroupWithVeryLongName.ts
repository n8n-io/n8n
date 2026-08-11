import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column, Entity, OneToMany } from '../../../../src';
import { AuthorWithVeryLongName } from './AuthorWithVeryLongName';

@Entity()
export class GroupWithVeryLongName {
	@PrimaryGeneratedColumn()
	groupId: number;

	@Column()
	name: string;

	@OneToMany(
		() => AuthorWithVeryLongName,
		(author) => author.groupWithVeryLongName,
	)
	authorsWithVeryLongName: AuthorWithVeryLongName[];
}
