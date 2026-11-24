import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from '../../../../src';
import { SuperLongTableName } from './SuperLongTableName';

@Entity()
export class SuperLongTableNameWhichIsRelatedToOriginalTable {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	superLongTableNameId: number;

	@ManyToOne(
		() => SuperLongTableName,
		(table) => table.relatedToOriginal,
	)
	@JoinColumn({ name: 'superLongTableNameId' })
	superLongTableName: SuperLongTableName;
}
