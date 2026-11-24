import 'reflect-metadata';
import { DriverUtils } from '../../../src/driver/DriverUtils';
import { expect } from 'chai';

describe('github issues > #7437 MongoDB options never parse in connectionUrl and after my fix was parse incorrect', () => {
	it('should parse options in ConnectionUrl', () => {
		const options = DriverUtils.buildMongoDBDriverOptions({
			url: 'mongodb://testuser:testpwd@test-primary.example.com:27017/testdb?retryWrites=true&w=majority&useUnifiedTopology=true',
		});

		expect(options.host ? (options.host as string) : '').to.equal('test-primary.example.com');
		expect(options.username ? (options.username as string) : '').to.equal('testuser');
		expect(options.password ? (options.password as string) : '').to.equal('testpwd');
		expect(options.port ? (options.port as number) : 0).to.equal(27017);
		expect(options.database ? (options.database as string) : '').to.equal('testdb');

		expect(options.retryWrites ? (options.retryWrites as string) : '').to.equal('true');
		expect(options.w ? (options.w as string) : '').to.equal('majority');
		expect(options.useUnifiedTopology ? (options.useUnifiedTopology as string) : '').to.equal(
			'true',
		);
	});
});
