import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { TableColumn } from '../../../src/schema-builder/table/TableColumn';
import {
	closeTestingConnections,
	createTestingConnections,
	createTypeormMetadataTable,
} from '../../utils/test-utils';
import { DriverUtils } from '../../../src/driver/DriverUtils';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';

describe('query runner > add column', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly add column and revert add', () =>
		Promise.all(
			connections.map(async (connection) => {
				let numericType = 'int';
				if (DriverUtils.isSQLiteFamily(connection.driver)) {
					numericType = 'integer';
				}

				const stringType = 'varchar';

				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				let column1 = new TableColumn({
					name: 'secondId',
					type: numericType,
					isUnique: true,
					isNullable: false,
				});

				// MySql, Sqlite does not supports autoincrement composite primary keys.
				if (!DriverUtils.isSQLiteFamily(connection.driver)) {
					column1.isGenerated = true;
					column1.generationStrategy = 'increment';
				}

				let column2 = new TableColumn({
					name: 'description',
					type: stringType,
					length: '100',
					default: "'this is description'",
					isNullable: false,
				});

				let column3 = new TableColumn({
					name: 'textAndTag',
					type: stringType,
					length: '200',
					generatedType: 'STORED',
					asExpression: 'text || tag',
					isNullable: false,
				});

				await queryRunner.addColumn(table!, column1);
				await queryRunner.addColumn('post', column2);

				table = await queryRunner.getTable('post');
				column1 = table!.findColumnByName('secondId')!;
				column1!.should.be.exist;
				column1!.isUnique.should.be.true;
				column1!.isNullable.should.be.false;

				// MySql, Sqlite does not supports autoincrement composite primary keys.
				// Spanner does not support autoincrement.
				if (!DriverUtils.isSQLiteFamily(connection.driver)) {
					column1!.isGenerated.should.be.true;
					column1!.generationStrategy!.should.be.equal('increment');
				}

				column2 = table!.findColumnByName('description')!;
				column2.should.be.exist;
				column2.length.should.be.equal('100');

				if (connection.driver.options.type === 'postgres') {
					let postgresSupported = false;

					if (connection.driver.options.type === 'postgres') {
						postgresSupported = (connection.driver as PostgresDriver).isGeneratedColumnsSupported;
					}

					if (postgresSupported) {
						// create typeorm_metadata table manually
						await createTypeormMetadataTable(connection.driver, queryRunner);
						await queryRunner.addColumn(table!, column3);
						table = await queryRunner.getTable('post');
						column3 = table!.findColumnByName('textAndTag')!;
						column3.should.be.exist;
						column3!.generatedType!.should.be.equals('STORED');
						column3!.asExpression!.should.be.a('string');
					}
				}

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('secondId')).to.be.undefined;
				expect(table!.findColumnByName('description')).to.be.undefined;

				await queryRunner.release();
			}),
		));
});
