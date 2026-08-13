import { DriverUtils } from '../../../src/driver/DriverUtils';
import { expect } from 'chai';

describe('github issues > #3737 Should URL-decode the user info of a data source URI', () => {
	it('should parse URL with percent-encoded username', () => {
		const obj: any = {
			username: 'user.name@domain.com',
			password: 'password',
			host: 'host',
			database: 'database',
			port: 8888,
		};

		const url = `postgres://${encodeURIComponent(obj.username)}:${
			obj.password
		}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });
		expect(options.username).to.eql(obj.username);
	});

	it('should parse URL with percent-encoded password', () => {
		const obj: any = {
			username: 'user',
			password: 'pass #w@rd ?',
			host: 'host',
			database: 'database',
			port: 8888,
		};

		const url = `postgres://${obj.username}:${encodeURIComponent(
			obj.password,
		)}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });
		expect(options.password).to.eql(obj.password);
	});
});
