import { Column, PrimaryGeneratedColumn } from '../../../../src/index';

export abstract class AbstractEntity {
	@PrimaryGeneratedColumn() id: number;
	@Column() firstname: string;
	@Column() lastname: string;
	@Column() fullname: string;
}
