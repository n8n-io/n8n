import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src';

@Entity()
export class View {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ transformer: [] })
	title: string;
}
