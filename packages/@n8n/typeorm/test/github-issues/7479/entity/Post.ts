import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('text', {
		nullable: false,
		comment: `E.g. 'foo', 'bar', or 'baz' etc.`,
	})
	text: string;

	@Column('text', {
		nullable: false,
		comment: `E.g. '''foo, 'bar''', or baz' etc.`,
	})
	text2: string;

	@Column('text', {
		nullable: false,
		comment: `E.g. "foo", "bar", or "baz" etc.`,
	})
	text3: string;
}
