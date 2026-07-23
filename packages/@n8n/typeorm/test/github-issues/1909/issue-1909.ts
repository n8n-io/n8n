import { DriverUtils } from '../../../src/driver/DriverUtils';
import { expect } from 'chai';

describe('github issues > #1493 Error parsing pg connection string', () => {
	it('should parse url with empty password', () => {
		const obj: any = {
			username: 'usern@me',
			password: '',
			host: 'host',
			database: 'database',
			port: 8888,
		};
		const url = `postgres://${obj.username}:@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });

		expect(options.username).to.eql(obj.username);
		expect(options.password).to.eql(obj.password);
	});

	it('should parse url without password', () => {
		const obj: any = {
			username: 'usern@me',
			password: '',
			host: 'host',
			database: 'database',
			port: 8888,
		};
		const url = `postgres://${obj.username}@${obj.host}:${obj.port}/${obj.database}`;
		const options = DriverUtils.buildDriverOptions({ url });

		expect(options.username).to.eql(obj.username);
		expect(options.password).to.eql(obj.password);
	});
});
