import {
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from '../../../../src';

@Entity()
export class Relation {
	@PrimaryGeneratedColumn()
	id: number;
}

@Entity()
export class OtherRelation {
	@PrimaryGeneratedColumn()
	id: number;
}

@Entity()
@Tree('closure-table')
export class RelationClosure {
	@PrimaryGeneratedColumn()
	id: number;

	@TreeChildren()
	children: RelationClosure[];

	@TreeParent()
	parent: RelationClosure;

	@OneToOne(() => Relation, { nullable: false })
	@JoinColumn()
	relation: Relation;

	@OneToOne(() => OtherRelation, { cascade: true })
	@JoinColumn()
	otherRelation: OtherRelation;
}

@Entity()
@Tree('nested-set')
export class RelationNested {
	@PrimaryGeneratedColumn()
	id: number;

	@TreeChildren()
	children: RelationNested[];

	@TreeParent()
	parent: RelationNested;

	@OneToOne(() => Relation, { nullable: false })
	@JoinColumn()
	relation: Relation;

	@OneToOne(() => OtherRelation, { cascade: true })
	@JoinColumn()
	otherRelation: OtherRelation;
}

@Entity()
@Tree('materialized-path')
export class RelationMaterialized {
	@PrimaryGeneratedColumn()
	id: number;

	@TreeChildren()
	children: RelationMaterialized[];

	@TreeParent()
	parent: RelationMaterialized;

	@OneToOne(() => Relation, { nullable: false })
	@JoinColumn()
	relation: Relation;

	@OneToOne(() => OtherRelation, { cascade: true })
	@JoinColumn()
	otherRelation: OtherRelation;
}
