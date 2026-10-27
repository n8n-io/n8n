import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	constructor(id: number, title: string) {
		this.id = id;
		this.title = title;
	}
}

module.exports = {
	type: 'postgres',
	name: 'test-conn',
	host: 'localhost',
	port: 5432,
	username: 'test',
	password: 'test',
	database: 'test',
	logging: false,
	entities: [Post],
};
