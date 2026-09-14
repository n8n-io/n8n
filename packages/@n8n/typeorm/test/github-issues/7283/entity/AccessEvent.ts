import {
	BaseEntity,
	Entity,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
} from '../../../../src';
import { Employee } from './Employee';

@Entity()
export class AccessEvent extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	id!: string;

	@ManyToOne(
		() => Employee,
		(employee) => employee.accessEvents,
	)
	employee!: Employee;

	@ManyToMany(() => Employee)
	@JoinTable()
	employees: Employee[];
}
