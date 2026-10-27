import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from '../../../../src';
import { Setting } from './Setting';

@Entity()
export class User extends BaseEntity {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany('Setting', 'asset', { cascade: true })
	settings: Setting[];

	constructor(id: number, name: string) {
		super();
		this.id = id;
		this.name = name;
	}
}
