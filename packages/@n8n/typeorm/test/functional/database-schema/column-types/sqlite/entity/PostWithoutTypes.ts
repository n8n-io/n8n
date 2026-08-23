import { Column, Entity, PrimaryColumn } from '../../../../../../src';

@Entity()
export class PostWithoutTypes {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	boolean: boolean;

	@Column()
	blob: Buffer;

	@Column()
	datetime: Date;
}
