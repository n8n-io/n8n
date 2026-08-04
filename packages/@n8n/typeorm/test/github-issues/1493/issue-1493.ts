import { DriverUtils } from '../../../src/driver/DriverUtils';
import { expect } from 'chai';
// import {exec} from "child_process";

describe('github issues > #1493 Error parsing pg connection string', () => {
	it('should parse common connection url', () => {
		const obj: any = {
			username: 'username',
			password: 'password',
			host: 'host',
			database: 'database',
			port: 8888,
		};
		const url = `postgres://${obj.username}:${obj.password}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });

		for (const key of Object.keys(obj)) {
			expect(options[key]).to.eql(obj[key]);
		}
	});

	it('should parse url with password contains colons', () => {
		const obj: any = {
			username: 'username',
			password: 'pas:swo:rd',
			host: 'host',
			database: 'database',
			port: 8888,
		};
		const url = `postgres://${obj.username}:${obj.password}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });

		expect(options.password).to.eql(obj.password);
	});

	it('should parse url with username and password contains at signs', () => {
		const obj: any = {
			username: 'usern@me',
			password: 'p@ssword',
			host: 'host',
			database: 'database',
			port: 8888,
		};
		const url = `postgres://${obj.username}:${obj.password}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });

		expect(options.username).to.eql(obj.username);
		expect(options.password).to.eql(obj.password);
	});
});
