import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	reloadTestingDatabases,
	setupSingleTestingConnection,
} from '../../utils/test-utils';
import { DataSource, Repository } from '../../../src';
import { Bar } from './entity/Bar';
import { DocumentEnum } from './documentEnum';

describe('github issues > #2871 Empty enum array is returned as array with single empty string', () => {
	let dataSource: DataSource;
	let repository: Repository<Bar>;

	before(async () => {
		const options = setupSingleTestingConnection('postgres', {
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});

		if (!options) return;

		dataSource = new DataSource(options);
		await dataSource.initialize();
	});
	beforeEach(async () => {
		if (!dataSource) return;
		await reloadTestingDatabases([dataSource]);
		repository = dataSource.getRepository(Bar);
	});
	after(() => closeTestingConnections([dataSource]));

	it("should extract array with values from enum array values from 'postgres'", async () => {
		if (!dataSource) return;
		const documents: DocumentEnum[] = [
			DocumentEnum.DOCUMENT_A,
			DocumentEnum.DOCUMENT_B,
			DocumentEnum.DOCUMENT_C,
		];

		const barSaved = await repository.save({ documents });
		const barFromDb = await repository.findOneByOrFail({
			barId: barSaved.barId,
		});

		expect(barFromDb.documents).to.eql(documents);
	});

	it("should extract array with one value from enum array with one value from 'postgres'", async () => {
		if (!dataSource) return;
		const documents: DocumentEnum[] = [DocumentEnum.DOCUMENT_D];

		const barSaved = await repository.save({ documents });
		const barFromDb = await repository.findOneByOrFail({
			barId: barSaved.barId,
		});

		expect(barFromDb.documents).to.eql(documents);
	});

	// This `it` test that issue #2871 is fixed
	it("should extract empty array from empty enum array from 'postgres'", async () => {
		if (!dataSource) return;
		const documents: DocumentEnum[] = [];

		const barSaved = await repository.save({ documents });
		const barFromDb = await repository.findOneByOrFail({
			barId: barSaved.barId,
		});

		expect(barFromDb.documents).to.eql(documents);
	});
});
