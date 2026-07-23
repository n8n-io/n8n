import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from '../../../../src';
import { SuperLongTableNameWhichIsRelatedToOriginalTable } from './SuperLongTableNameIsRelatedToOriginal';

@Entity()
export class SuperLongTableName {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => SuperLongTableNameWhichIsRelatedToOriginalTable,
		(table) => table.superLongTableName,
	)
	relatedToOriginal: SuperLongTableNameWhichIsRelatedToOriginalTable[];
}
