import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
export class Post {
	private _title: string;

	@PrimaryGeneratedColumn()
	id: number;

	set title(title: string) {
		// this._title = "!" + title + "!"; // if you'll do "append" like this, you won't get expected results, because setter is called multiple times
		if (title === 'hello') {
			this._title = 'bye';
		} else {
			this._title = title;
		}
	}

	@Column()
	get title(): string {
		return this._title;
	}
}
