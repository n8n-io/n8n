import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

class ExampleBigNumber {
	constructor(private value: string) {}

	toFixed() {
		return this.value;
	}
}

@Entity()
export class ExampleEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'numeric',
		nullable: false,
		transformer: {
			from: (value: any): ExampleBigNumber => {
				return new ExampleBigNumber(value);
			},
			to: (value: any): string => {
				return value.toFixed();
			},
		},
	})
	total: ExampleBigNumber;
}
