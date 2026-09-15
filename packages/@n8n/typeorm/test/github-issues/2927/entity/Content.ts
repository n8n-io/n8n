import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../src';

export enum ContentType {
	Photo = 'photo',
	Post = 'post',
	SpecialPhoto = 'special_photo',
}

@Entity()
@TableInheritance({
	pattern: 'STI',
	column: { type: 'enum', name: 'content_type', enum: ContentType },
})
export class Content {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	description: string;
}
