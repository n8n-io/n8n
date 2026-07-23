import { ChildEntity, OneToOne, JoinColumn, ManyToMany, JoinTable } from '../../../../src/index';

import { TournamentParticipant } from './TournamentParticipant';
import { User } from './User';

@ChildEntity()
export class TournamentSquadParticipant extends TournamentParticipant {
	@OneToOne((type) => User, {
		eager: true,
	})
	@JoinColumn()
	public owner: User;

	@ManyToMany((type) => User, {
		eager: true,
	})
	@JoinTable({ name: 'tournament_squad_participants' })
	public users: User[];

	constructor(tournamentSquadParticipant?: { users: User[]; owner: User }) {
		super();

		if (tournamentSquadParticipant) {
			this.users = tournamentSquadParticipant.users;
			this.owner = tournamentSquadParticipant.owner;
		}
	}
}
