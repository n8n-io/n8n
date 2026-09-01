import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

export enum EnumStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
}

@Entity('module-foo_table_x')
export class Foo {
	@PrimaryGeneratedColumn({ name: 'id' })
	id: number;

	@Column({ type: 'enum', enum: EnumStatus, default: EnumStatus.DRAFT })
	enumStatus: Date;
}
