import { Column } from '../../../../../src/decorator/columns/Column';
import { BeforeInsert } from '../../../../../src/decorator/listeners/BeforeInsert';
import { BeforeUpdate } from '../../../../../src/decorator/listeners/BeforeUpdate';

export class PostCounter {
	@Column({ nullable: true })
	likes: number;

	@BeforeInsert()
	beforeInsert() {
		this.likes = 0;
	}

	@BeforeUpdate()
	beforeUpdate() {
		this.likes++;
	}
}
