import { Column, Entity, PrimaryColumn } from '../../../../../src';

export class EmbeddedEntity {
	@Column({ nullable: true })
	foo: string;

	@Column({ nullable: true })
	bar: string;
}

@Entity()
export class ExternalIdPrimaryKeyEntity {
	@PrimaryColumn()
	externalId: string;

	@Column()
	title: string;

	@Column(() => EmbeddedEntity)
	embedded: EmbeddedEntity;
}
