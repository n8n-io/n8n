import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Generated } from '../../../../../src/decorator/Generated';

@Entity()
export class Question {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	@Generated('uuid')
	uuid: string;

	@Column()
	uuid2: string;

	@Column('varchar', { nullable: true })
	uuid3: string | null;

	@Column('varchar', { nullable: true })
	@Generated('uuid')
	uuid4: string | null;
}
