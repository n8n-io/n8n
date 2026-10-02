import { Column, ManyToOne } from '../../../../src';
import { User } from './User';

export class Embedded {
	@ManyToOne(() => User) relationUser1: User;

	@ManyToOne(() => User) relationUser2: User;
	@Column() relationUser2Id: number;
}
