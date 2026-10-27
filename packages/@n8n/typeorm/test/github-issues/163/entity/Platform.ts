import { Entity } from '../../../../src/decorator/entity/Entity';
import { Index } from '../../../../src/decorator/Index';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { Game } from './Game';

@Entity('platforms')
@Index('platform_name_idx', ['name'], { unique: true })
export class Platform {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 100,
	})
	name: string;

	@Column({
		length: 100,
	})
	slug: string;

	@ManyToMany(
		(type) => Game,
		(game) => game.platforms,
	)
	games: Game[];
}
