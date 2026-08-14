import { expect } from 'chai';
import { writeFileSync, unlinkSync } from 'fs';
import { ConnectionOptionsReader } from '../../../src/connection/ConnectionOptionsReader';
import { importClassesFromDirectories } from '../../../src/util/DirectoryExportedClassesLoader';
import { LoggerFactory } from '../../../src/logger/LoggerFactory';

describe('github issues > #6284 cli support for cjs extension', () => {
	it('will load a cjs file', async () => {
		const cjsConfigPath = [__dirname, 'ormconfig.cjs'].join('/');
		const databaseType = 'postgres';
		const config = `module.exports = {"type": "${databaseType}"};`;

		writeFileSync(cjsConfigPath, config);
		const reader = new ConnectionOptionsReader({ root: __dirname });

		const results = await reader.all();
		expect(results).to.be.an('Array');
		expect(results[0]).to.be.an('Object');
		expect(results[0].type).to.equal(databaseType);

		unlinkSync(cjsConfigPath);
	});

	it('loads cjs files via DirectoryExportedClassesloader', async () => {
		const klassPath = [__dirname, 'klass.cjs'].join('/');
		const klass = `module.exports.Widget = class Widget {};`;
		writeFileSync(klassPath, klass);

		const classes = await importClassesFromDirectories(new LoggerFactory().create(), [
			`${__dirname}/*.cjs`,
		]);
		expect(classes).to.be.an('Array');
		expect(classes.length).to.eq(1);

		unlinkSync(klassPath);
	});
});
