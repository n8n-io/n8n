import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src';

export class EmbeddedEntityWithUniqueColumn {
	@Column({ nullable: true, unique: true })
	id: string;

	@Column({ nullable: true })
	value: string;
}

@Entity()
export class EmbeddedUQEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column(() => EmbeddedEntityWithUniqueColumn)
	embedded: EmbeddedEntityWithUniqueColumn;
}
