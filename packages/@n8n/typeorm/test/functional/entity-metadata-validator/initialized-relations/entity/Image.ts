import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ImageInfo } from './ImageInfo';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => ImageInfo,
		(imageInfo) => imageInfo.image,
	)
	informations: ImageInfo[] = [];
}
