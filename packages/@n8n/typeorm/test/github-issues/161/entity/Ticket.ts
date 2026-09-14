import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { Request } from './Request';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Ticket {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne((type) => Request, {
		cascade: true,
	})
	@JoinColumn()
	request: Request;
}
