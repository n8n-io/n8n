import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class ChildEntity {
	@PrimaryGeneratedColumn({ type: 'bigint' })
	id: string;
}
