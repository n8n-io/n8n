import { Column, Entity, Index, PrimaryGeneratedColumn } from '../../../../src';

@Entity({
	name: 'user',
})
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Index('concurrentTest', { concurrent: true })
	@Column({ nullable: true })
	name: string;
}
