import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { Ticket } from './Ticket';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Request {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	owner: string;

	@Column()
	type: string;

	@Column()
	success: boolean;

	@OneToOne(
		(type) => Ticket,
		(ticket) => ticket.request,
	)
	ticket: Ticket;
}
