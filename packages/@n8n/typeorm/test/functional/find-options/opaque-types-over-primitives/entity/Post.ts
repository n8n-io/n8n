import { Column, Entity, PrimaryColumn } from '../../../../../src';

export type WithType<T> = T & { type: 'Post' };

@Entity()
export class Post {
	@PrimaryColumn({ type: Number })
	id: number & { type: 'Post' };

	@Column({ type: String })
	title: string & { type: 'Post' };

	@Column({ type: Boolean })
	isEdited: boolean & { type: 'Post' };
}
