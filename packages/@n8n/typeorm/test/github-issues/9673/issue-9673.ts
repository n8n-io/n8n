import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, SelectQueryBuilder } from '../../../src';
import { expect } from 'chai';
import sinon from 'sinon';
import { Node } from './entity/Node';
import { Fact } from './entity/Fact';
import { Rule } from './entity/Rule';

describe('github issues > #9673 TreeRepository not loading relations on findDescendants() method using QUERY method (relationLoadStrategy)', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				relationLoadStrategy: 'query',
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should generate multiple queries per relation', async () => {
		for (const dataSource of dataSources) {
			const nodeRepository = dataSource.getTreeRepository(Node);
			const ruleRepository = dataSource.getRepository(Rule);
			const factRepository = dataSource.getRepository(Fact);

			// Entity instances setup
			let parent = await nodeRepository.save(nodeRepository.create({ name: 'root node' }));
			let child = await nodeRepository.save(nodeRepository.create({ name: 'child node', parent }));
			const [factA, factB] = await factRepository.save([{ name: 'Fact A' }, { name: 'Fact B' }]);
			const rules = await ruleRepository.save([
				{ name: 'Rule 1', node: child, fact: factA },
				{ name: 'Rule 2', node: child, fact: factA },
				{ name: 'Rule 3', node: child, fact: factB },
			]);

			const leftJoinBuilder = sinon.spy(SelectQueryBuilder.prototype, 'leftJoinAndSelect');

			// Validate data loaded correctly
			[, child] = await nodeRepository.findDescendants(parent, {
				relations: ['rules', 'rules.fact'],
			});

			expect(child.rules).length(rules.length);
			child.rules?.forEach((rule) => {
				expect(rule.fact).exist;
			});
			expect(leftJoinBuilder.called).not.to.be.true;
			leftJoinBuilder.restore();
		}
	});
});
