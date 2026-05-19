import 'reflect-metadata';
import { DataSource } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import {
	EnumEntity,
	NumericEnum,
	StringEnum,
	HeterogeneousEnum,
	StringNumericEnum,
} from './entity/EnumEntity';

describe('database schema > enums', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly use default values', () =>
		Promise.all(
			connections.map(async (connection) => {
				const enumEntityRepository = connection.getRepository(EnumEntity);

				const enumEntity = new EnumEntity();
				enumEntity.id = 1;
				enumEntity.enumWithoutDefault = StringEnum.EDITOR;
				await enumEntityRepository.save(enumEntity);

				const loadedEnumEntity = await enumEntityRepository.findOneBy({
					id: 1,
				});
				loadedEnumEntity!.numericEnum.should.be.eq(NumericEnum.MODERATOR);
				loadedEnumEntity!.stringEnum.should.be.eq(StringEnum.GHOST);
				loadedEnumEntity!.stringNumericEnum.should.be.eq(StringNumericEnum.FOUR);
				loadedEnumEntity!.heterogeneousEnum.should.be.eq(HeterogeneousEnum.NO);
				loadedEnumEntity!.arrayDefinedStringEnum.should.be.eq('ghost');
				loadedEnumEntity!.arrayDefinedNumericEnum.should.be.eq(12);
			}),
		));

	it('should correctly save and retrieve', () =>
		Promise.all(
			connections.map(async (connection) => {
				const enumEntityRepository = connection.getRepository(EnumEntity);

				const enumEntity = new EnumEntity();
				enumEntity.id = 1;
				enumEntity.numericEnum = NumericEnum.EDITOR;
				enumEntity.stringEnum = StringEnum.ADMIN;
				enumEntity.stringNumericEnum = StringNumericEnum.TWO;
				enumEntity.heterogeneousEnum = HeterogeneousEnum.YES;
				enumEntity.arrayDefinedStringEnum = 'editor';
				enumEntity.arrayDefinedNumericEnum = 13;
				enumEntity.enumWithoutDefault = StringEnum.ADMIN;
				await enumEntityRepository.save(enumEntity);

				const loadedEnumEntity = await enumEntityRepository.findOneBy({
					id: 1,
				});
				loadedEnumEntity!.numericEnum.should.be.eq(NumericEnum.EDITOR);
				loadedEnumEntity!.stringEnum.should.be.eq(StringEnum.ADMIN);
				loadedEnumEntity!.stringNumericEnum.should.be.eq(StringNumericEnum.TWO);
				loadedEnumEntity!.heterogeneousEnum.should.be.eq(HeterogeneousEnum.YES);
				loadedEnumEntity!.arrayDefinedStringEnum.should.be.eq('editor');
				loadedEnumEntity!.arrayDefinedNumericEnum.should.be.eq(13);
			}),
		));

	it('should not generate queries when no model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.driver.createSchemaBuilder().build();

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();

				console.log(sqlInMemory.upQueries);

				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));
});
