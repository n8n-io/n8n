import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '../../../../src/index';
import { MainModel } from './MainModel';
import { ValidationModel } from './ValidationModel';

@Entity()
export class DataModel {
	@PrimaryColumn()
	validation: number;

	@PrimaryColumn()
	mainId: number;

	@ManyToOne(
		(type) => ValidationModel,
		(validation) => validation.dataModel,
		{ eager: true },
	)
	@JoinColumn({
		name: 'validation',
		referencedColumnName: 'validation',
	})
	validations: ValidationModel;

	@ManyToOne(
		(type) => MainModel,
		(main) => main.dataModel,
	)
	@JoinColumn({
		name: 'mainId',
		referencedColumnName: 'id',
	})
	main: MainModel;

	@Column({
		type: 'boolean',
		default: false,
	})
	active: boolean;
}
