import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { LoadEvent } from '../../../../src/subscriber/event/LoadEvent';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	simpleSubscriberSaw?: boolean;
	extendedSubscriberSaw?: LoadEvent<Post>;
}
