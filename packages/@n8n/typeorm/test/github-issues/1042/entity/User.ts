import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Profile } from './Profile';
import { Information } from './Information';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	registeredAt: Date;

	@Column('json')
	profile: Profile;

	@Column((type) => Information)
	information: Information;
}
