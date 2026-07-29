import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class PostDetails {
	@PrimaryColumn()
	keyword: string;
}
