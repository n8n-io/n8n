import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@Column({ update: false, default: 'Default' })
	authorFirstName: string;

	@Column({ insert: false, default: 'Default' })
	authorMiddleName: string;

	@Column({ insert: false, update: false, default: 'Default' })
	authorLastName: string;
}
