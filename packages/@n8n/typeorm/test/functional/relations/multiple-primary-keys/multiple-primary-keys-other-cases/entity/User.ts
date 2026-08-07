import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { EventMember } from './EventMember';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => EventMember,
		(member) => member.user,
	)
	members: EventMember[];
}
