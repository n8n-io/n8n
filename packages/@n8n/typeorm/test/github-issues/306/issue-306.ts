import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Race } from './entity/Race';
import { Duration } from './entity/Duration';

describe("github issues > #306 embeddeds with custom column name don't work", () => {
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
				race.duration = new Duration();
				race.duration.durationDays = 1;
				race.duration.durationHours = 10;
				race.duration.durationMinutes = 30;

				await connection.manager.save(race);

				const loadedRace = await connection.manager.findOneBy(Race, {
					name: 'National Race',
				});
				expect(loadedRace).to.be.not.undefined;
				expect(loadedRace!.id).to.be.not.undefined;
				expect(loadedRace!.duration).to.be.not.undefined;
				loadedRace!.name.should.be.equal('National Race');
				loadedRace!.duration.should.be.instanceOf(Duration);
				loadedRace!.duration.durationDays.should.be.equal(1);
				loadedRace!.duration.durationHours.should.be.equal(10);
				loadedRace!.duration.durationMinutes.should.be.equal(30);
			}),
		));
});
