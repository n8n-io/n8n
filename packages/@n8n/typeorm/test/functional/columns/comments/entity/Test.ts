import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
export class Test {
	@PrimaryGeneratedColumn()
	id: number;

	// Standard Comment
	@Column({ comment: 'Hello World' })
	a: string;

	// Comment with a newline
	@Column({ comment: 'Hello\nWorld' })
	b: string;

	// Comment with a single quote
	@Column({ comment: "Hello World! It's going to be a beautiful day." })
	c: string;

	// Comment with special characters
	@Column({ comment: 'Hello World! #@!$`' })
	d: string;

	// Comment with control characters
	@Column({ comment: 'Hello World. \r\n\t\b\f\v\0' })
	e: string;

	// Comment that ends with a backslash
	@Column({ comment: 'Hello World.\\' })
	f: string;

	// Comment that is only whitespace
	@Column({ comment: ' ' })
	g: string;

	// Comment that is empty
	@Column({ comment: '' })
	h: string;

	// No comment.
	@Column()
	i: string;
}
