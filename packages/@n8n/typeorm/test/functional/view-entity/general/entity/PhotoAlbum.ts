import { DataSource, ValueTransformer } from '../../../../../src';
import { ViewColumn } from '../../../../../src/decorator/columns/ViewColumn';
import { ViewEntity } from '../../../../../src/decorator/entity-view/ViewEntity';
import { Album } from './Album';
import { Photo } from './Photo';

export const uppercase: ValueTransformer = {
	to: (entityValue: string) => {},
	from: (databaseValue: string) => databaseValue.toLocaleUpperCase(),
};

export const lowercase: ValueTransformer = {
	to: (entityValue: string) => {},
	from: (databaseValue: string) => databaseValue.toLocaleLowerCase(),
};

export const removeWhitespace: ValueTransformer = {
	to: (entityValue: string) => {},
	from: (databaseValue: string) => databaseValue.replace(/\s/g, ''),
};
@ViewEntity({
	expression: (dataSource: DataSource) =>
		dataSource
			.createQueryBuilder()
			.select('photo.id', 'id')
			.addSelect('photo.name', 'name')
			.addSelect('photo.albumId', 'albumId')
			.addSelect('album.name', 'albumName')
			.from(Photo, 'photo')
			.leftJoin(Album, 'album', 'album.id = photo.albumId')
			.where("album.name = 'Boeing photos'"),
})
export class PhotoAlbum {
	@ViewColumn()
	id: number;

	@ViewColumn({ transformer: [lowercase, removeWhitespace] })
	name: string;

	@ViewColumn({ transformer: uppercase })
	albumName: string;

	@ViewColumn({ name: 'albumId' })
	photoAlbumId: number;
}
