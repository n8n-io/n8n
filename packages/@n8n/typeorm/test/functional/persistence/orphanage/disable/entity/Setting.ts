import { User } from './User';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Setting {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	data: string;

	@Column()
	userId: string;

	@ManyToOne(
		() => User,
		(user) => user.settings,
		{
			orphanedRowAction: 'disable',
		},
	)
	@JoinColumn({ name: 'userId' })
	user: User;

	constructor(data: string) {
		this.data = data;
	}
}
