import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { WrappedNumber, transformer } from '../transformer';

@Entity()
export class Dummy {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: Number, transformer })
	num: WrappedNumber;
}
