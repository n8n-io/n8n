import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Game } from './entity/Game';
import { Platform } from './entity/Platform';
import { expect } from 'chai';

describe("github issues > #163 ManyToMany relation : Cannot read property 'joinColumnName' of undefined", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should persist class table child successfully', () =>
		Promise.all(
			connections.map(async (connection) => {
				let battlefront = new Game();
				battlefront.name = 'SW Battlefront';
				battlefront.searchTerms = 'star-wars,arcade';
				battlefront.isReviewed = false;

				let republicCommando = new Game();
				republicCommando.name = 'SW Republic Commando';
				republicCommando.searchTerms = 'star-wars,shooter';
				republicCommando.isReviewed = false;

				await connection.manager.save(battlefront);
				await connection.manager.save(republicCommando);

				const platform = new Platform();
				platform.name = 'Windows';
				platform.slug = 'windows';
				platform.games = [battlefront, republicCommando];

				await connection.manager.save(platform);

				const loadedPlatform = await connection
					.getRepository(Platform)
					.findOne({ where: { slug: 'windows' } });

				let jediAcademy = new Game();
				jediAcademy.name = 'SW Jedi Academy';
				jediAcademy.searchTerms = 'star-wars,arcade';
				jediAcademy.platforms = [loadedPlatform!];
				jediAcademy.isReviewed = false;

				await connection.manager.save(jediAcademy);

				const completePlatform = await connection
					.getRepository(Platform)
					.createQueryBuilder('platform')
					.leftJoinAndSelect('platform.games', 'game')
					.where('platform.slug=:slug', { slug: 'windows' })
					.orderBy('platform.id')
					.addOrderBy('game.id')
					.getOne();

				expect(completePlatform).not.to.be.null;
				completePlatform!.should.be.eql({
					id: platform.id,
					name: 'Windows',
					slug: 'windows',
					games: [
						{
							id: battlefront.id,
							name: 'SW Battlefront',
							searchTerms: 'star-wars,arcade',
							isReviewed: false,
						},
						{
							id: republicCommando.id,
							name: 'SW Republic Commando',
							searchTerms: 'star-wars,shooter',
							isReviewed: false,
						},
						{
							id: jediAcademy.id,
							name: 'SW Jedi Academy',
							searchTerms: 'star-wars,arcade',
							isReviewed: false,
						},
					],
				});

				// what code shall I put there to completely reproduce your issue?
			}),
		));
});
