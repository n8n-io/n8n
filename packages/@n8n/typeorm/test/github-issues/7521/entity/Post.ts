import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		comment: `E.g. 'foo', 'bar', or 'baz' etc.`,
	})
	col1: string;

	@Column({
		comment: `E.g. '''foo, 'bar''', or baz' etc.`,
	})
	col2: string;

	@Column({
		comment: `E.g. "foo", "bar", or "baz" etc.`,
	})
	col3: string;

	@Column({
		comment: 'foo\\bar, bar\\baz, foo\\\\baz',
	})
	col4: string;

	@Column({
		comment: 'foo: \0, bar: \0\0\0',
	})
	col5: string;

	@Column({
		comment: `"foo", ""bar""`,
	})
	col6: string;

	@Column({
		comment: '"foo", ""bar""',
	})
	col7: string;

	@Column({
		comment: 'foo \r \n \b \t Z % _ bar',
	})
	col8: string;

	@Column({
		comment: 'foo \\r \\n \\b \\t \\Z \\% \\_ bar',
	})
	col9: string;
}
