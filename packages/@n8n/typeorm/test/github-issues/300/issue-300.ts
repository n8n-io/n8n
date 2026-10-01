import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Race } from './entity/Race';

describe('github issues > #300 support of embeddeds that are not set', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('embedded with custom column name should persist and load without errors', () =>
		Promise.all(
			connections.map(async (connection) => {
				const race = new Race();
				race.name = 'National Race';

				await connection.manager.save(race);

				const loadedRace = await connection.manager.findOneBy(Race, {
					name: 'National Race',
				});
				expect(loadedRace).to.exist;
				expect(loadedRace!.id).to.exist;
				loadedRace!.name.should.be.equal('National Race');
				expect(loadedRace!.duration).to.exist;
				expect(loadedRace!.duration.minutes).to.be.null;
				expect(loadedRace!.duration.hours).to.be.null;
				expect(loadedRace!.duration.days).to.be.null;
			}),
		));
});
