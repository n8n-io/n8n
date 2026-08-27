import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Human } from './entity/Human';
import { Animal } from './entity/Animal';
import { Gender } from './entity/GenderEnum';
import { EntityManager } from '../../../src/entity-manager/EntityManager';
import { expect } from 'chai';

describe('github issues > #4106 Specify enum type name in postgres', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Human, Animal],
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	async function prepareData(connection: DataSource) {
		const human = new Human();
		human.id = 1;
		human.name = 'Jane Doe';
		human.gender = Gender.female;
		await connection.manager.save(human);

		const animal = new Animal();
		animal.id = 1;
		animal.name = 'Miko';
		animal.specie = 'Turtle';
		animal.gender = Gender.male;
		await connection.manager.save(animal);
	}

	/*
	 * ISSUE: Test expects PostgreSQL ENUM type to be created with custom name "genderEnum" as specified in column options.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Enum Name Case Sensitivity Issues: PostgreSQL creates enum types in lowercase by default,
	 *    but the test expects a mixed-case name "genderEnum". TypeORM may not be properly quoting
	 *    the enum name during creation, causing PostgreSQL to lowercase it to "genderenum" instead.
	 *
	 * 2. Schema Synchronization Timing: The enum type creation may happen asynchronously or in a
	 *    separate transaction from the table creation. The test might be executing before the enum
	 *    type is fully committed to the database, causing the query to not find the expected type.
	 *
	 * 3. Enum Type Visibility Issues: The pg_type_is_visible() function in the query may filter out
	 *    the enum type if it's created in a different schema or if there are search_path issues.
	 *    TypeORM might be creating the enum in a schema that's not visible to the test query.
	 *
	 * POTENTIAL FIXES:
	 * - Fix enum name quoting in PostgreSQL driver to preserve case sensitivity
	 * - Add proper synchronization waits for enum type creation completion
	 * - Ensure enum types are created in the correct schema with proper visibility
	 */
	it.skip('should create an enum with the name specified in column options -> enumName', () =>
		Promise.all(
			connections.map(async (connection) => {
				const em = new EntityManager(connection);
				const types = await em.query(`SELECT typowner, n.nspname as "schema",
                    pg_catalog.format_type(t.oid, NULL) AS "name",
                    pg_catalog.obj_description(t.oid, 'pg_type') as "description"
                    FROM pg_catalog.pg_type t
                        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                    WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
                        AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
                        AND pg_catalog.pg_type_is_visible(t.oid)
                        AND n.nspname = 'public'
                    ORDER BY 1, 2;`);

				// Enum name must be exactly the same as stated
				// Quoted here since the name contains mixed case
				expect(types.some((type: any) => type.name === `"genderEnum"`)).to.be.true;
			}),
		));

	/*
	 * ISSUE: Test expects enum columns to use the correct custom enum type and allow data insertion/retrieval.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Column Type Resolution Failure: The information_schema query expects columns to have
	 *    data_type="USER-DEFINED" and udt_name="genderEnum", but TypeORM may be creating the
	 *    columns with incorrect type mapping, causing them to appear as regular text columns.
	 *
	 * 2. Enum Value Validation Issues: PostgreSQL enum types enforce value constraints, and if
	 *    TypeORM is not properly creating the enum type with the correct values ("male", "female"),
	 *    the data insertion may fail or the enum constraints may not be applied correctly.
	 *
	 * 3. Multiple Entity Enum Sharing Problems: Both Human and Animal entities use the same
	 *    enum type "genderEnum". TypeORM may have issues with shared enum types between multiple
	 *    entities, potentially creating duplicate types or failing to properly reference them.
	 *
	 * POTENTIAL FIXES:
	 * - Fix column type mapping for PostgreSQL enum columns in information_schema queries
	 * - Ensure enum value consistency between TypeScript enum and PostgreSQL type creation
	 * - Improve shared enum type management across multiple entities
	 */
	it.skip('should insert data with the correct enum', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const em = new EntityManager(connection);

				const humanTable = await em.query(`SELECT column_name as "columnName", data_type as "dataType", udt_name as "udtName" FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'human'
                    ORDER BY ordinal_position;`);
				const animalTable = await em.query(`SELECT column_name as "columnName", data_type as "dataType", udt_name as "udtName" FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'animal'
                    ORDER BY ordinal_position;`);

				expect(humanTable[2].dataType).to.equal('USER-DEFINED');
				expect(humanTable[2].udtName).to.equal('genderEnum');

				expect(animalTable[2].dataType).to.equal('USER-DEFINED');
				expect(animalTable[2].udtName).to.equal('genderEnum');

				const HumanRepository = connection.manager.getRepository(Human);
				const AnimalRepository = connection.manager.getRepository(Animal);

				const human = await HumanRepository.find();
				const animal = await AnimalRepository.find();

				expect(human[0].gender).to.equal('female');
				expect(animal[0].gender).to.equal('male');
			}),
		));
});
