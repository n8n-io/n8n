import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Address {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'jsonb' })
	country: Record<string, unknown>;

	@Column({ type: 'jsonb' })
	city: Record<string, unknown>;
}
