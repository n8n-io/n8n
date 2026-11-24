import {
	Column,
	Entity,
	PrimaryColumn,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from '../../../../src';

@Entity()
@Tree('closure-table')
export class SingleIdClosure {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	name: string;

	@TreeChildren()
	children: SingleIdClosure[];

	@TreeParent({ onDelete: 'CASCADE' })
	parent: SingleIdClosure | null;
}

@Entity()
@Tree('nested-set')
export class SingleIdNested {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	name: string;

	@TreeChildren()
	children: SingleIdNested[];

	@TreeParent({ onDelete: 'CASCADE' })
	parent: SingleIdNested | null;
}

@Entity()
@Tree('materialized-path')
export class SingleIdMaterialized {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	name: string;

	@TreeChildren()
	children: SingleIdMaterialized[];

	@TreeParent({ onDelete: 'CASCADE' })
	parent: SingleIdMaterialized | null;
}

@Entity()
@Tree('nested-set')
export class MultiIdNested {
	@PrimaryColumn()
	column: string;

	@PrimaryColumn()
	row: number;

	@Column({ nullable: true })
	name: string;

	@TreeChildren()
	children: MultiIdNested[];

	@TreeParent({ onDelete: 'CASCADE' })
	parent: MultiIdNested | null;
}

@Entity()
@Tree('materialized-path')
export class MultiIdMaterialized {
	@PrimaryColumn()
	column: string;

	@PrimaryColumn()
	row: number;

	@Column({ nullable: true })
	name: string;

	@TreeChildren()
	children: MultiIdMaterialized[];

	@TreeParent({ onDelete: 'CASCADE' })
	parent: MultiIdMaterialized | null;
}
