import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

export enum ExampleEnum {
	EnumValue1 = 'enumvalue1',
	EnumValue2 = 'enumvalue2',
	EnumValue3 = 'enumvalue3',
	EnumValue4 = 'enumvalue4',
}

@Entity()
export class ExampleEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'simple-enum',
		enum: ExampleEnum,
	})
	enumcolumn: ExampleEnum;
}
