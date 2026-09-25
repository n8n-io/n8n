import { Entity, PrimaryGeneratedColumn, OneToOne } from '../../../../src/index';

import { Tournament } from './Tournament';

@Entity()
export class TournamentGraph {
	@PrimaryGeneratedColumn()
	public id: number;

	@OneToOne(
		(type) => Tournament,
		(tournament) => tournament.graph,
	)
	public tournament: Tournament;
}
