import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

import { TournamentGraph } from './entity/TournamentGraph';
import { SquadBilliardsTournament } from './entity/SquadBilliardsTournament';

describe('other issues > using nested child entities', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));

	after(() => closeTestingConnections(connections));

	it('should insert without error', () =>
		Promise.all(
			connections.map(async (connection) => {
				const squadBilliardsTournament = new SquadBilliardsTournament({
					name: 'Squad Tournament',
				});

				await connection.manager.save(squadBilliardsTournament);
				const tournamentGraph = new TournamentGraph();

				tournamentGraph.tournament = squadBilliardsTournament;

				await connection.manager.save(tournamentGraph);
			}),
		));
});
