import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'title' })
	private _title: string;

	@Column()
	text: string;

	set title(title: string) {
		this._title = title;
	}

	get title(): string {
		return this._title;
	}
}
