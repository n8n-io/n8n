import { Entity, PrimaryGeneratedColumn, OneToMany } from '../../../../src/index';
import { DataModel } from './DataModel';

@Entity()
export class MainModel {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToMany(
		(type) => DataModel,
		(dataModel) => dataModel.main,
		{
			cascade: true,
			eager: true,
		},
	)
	dataModel: DataModel[];
}
