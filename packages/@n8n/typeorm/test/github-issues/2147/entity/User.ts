import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
} from '../../../../src';

@Entity()
@Unique(['clientId', 'key'])
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	public key: number;

	@Column({ name: 'client_id' })
	public clientId: number;

	@Column()
	public name: string;

	@Column({ name: 'updated_by' })
	public updatedById: number;

	@ManyToOne((type) => User)
	@JoinColumn([
		{ name: 'client_id', referencedColumnName: 'clientId' },
		{ name: 'updated_by', referencedColumnName: 'key' },
	])
	public updatedBy: Promise<User>;
}
