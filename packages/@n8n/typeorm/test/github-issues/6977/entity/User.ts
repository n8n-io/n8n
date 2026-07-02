import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';
import { Embedded } from './Embedded';

@Entity()
export class User {
	@PrimaryGeneratedColumn() id: number;

	@Column(() => Embedded) embedded: Embedded;
}
