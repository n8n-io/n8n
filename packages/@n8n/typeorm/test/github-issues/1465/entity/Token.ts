import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { TableInheritance } from '../../../../src/decorator/entity/TableInheritance';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Token {
	@PrimaryGeneratedColumn() id: number;

	@Column() tokenSecret: string;

	@Column() expiresOn: Date;
}
