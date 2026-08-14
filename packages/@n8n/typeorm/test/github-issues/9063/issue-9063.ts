import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';

describe('github issues > #9063 Support postgres column with varchar datatype and uuid_generate_v4() default', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('it should be able to set special keyword as column name for simple-enum types', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				const generatedUuid1 = table!.findColumnByName('generatedUuid1')!;
				const generatedUuid2 = table!.findColumnByName('generatedUuid2')!;
				const generatedUuid3 = table!.findColumnByName('generatedUuid3')!;
				const nonGeneratedUuid1 = table!.findColumnByName('nonGeneratedUuid1')!;
				const nonGeneratedUuid2 = table!.findColumnByName('nonGeneratedUuid2')!;

				expect(generatedUuid1.isGenerated).to.be.true;
				expect(generatedUuid1.type).to.equal('uuid');
				expect(generatedUuid1.default).to.be.undefined;

				expect(generatedUuid2.isGenerated).to.be.true;
				expect(generatedUuid2.type).to.equal('uuid');
				expect(generatedUuid2.default).to.be.undefined;

				expect(generatedUuid3.isGenerated).to.be.true;
				expect(generatedUuid3.type).to.equal('uuid');
				expect(generatedUuid3.default).to.be.undefined;

				expect(nonGeneratedUuid1.isGenerated).to.be.false;
				expect(nonGeneratedUuid1.type).to.equal('character varying');
				expect(nonGeneratedUuid1.default).to.equal('uuid_generate_v4()');

				expect(nonGeneratedUuid2.isGenerated).to.be.false;
				expect(nonGeneratedUuid2.type).to.equal('character varying');
				expect(nonGeneratedUuid2.default).to.equal('gen_random_uuid()');

				await queryRunner.release();
			}),
		));
});
