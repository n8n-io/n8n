import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class PostMultiplePrimaryKeys {
	@PrimaryColumn()
	firstId: number;

	@PrimaryColumn()
	secondId: number;

	@Column({ default: 'Hello Multi Ids' })
	text: string;
}
