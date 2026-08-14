import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Dummy {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true, default: () => 'NOW()' })
	UploadDate: string;
}
