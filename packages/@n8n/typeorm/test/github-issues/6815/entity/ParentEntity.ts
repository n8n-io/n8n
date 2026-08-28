import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, RelationId } from '../../../../src';
import { ChildEntity } from './ChildEntity';

@Entity()
export class ParentEntity {
	@PrimaryGeneratedColumn({ type: 'bigint' })
	id: string;

	@OneToOne(() => ChildEntity, { nullable: true })
	@JoinColumn()
	child: ChildEntity | null;

	@RelationId((parent: ParentEntity) => parent.child)
	childId: string | null;
}
