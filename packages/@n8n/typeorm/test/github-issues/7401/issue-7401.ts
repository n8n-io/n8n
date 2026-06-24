import 'reflect-metadata';
import { DriverUtils } from '../../../src/driver/DriverUtils';
import { expect } from 'chai';

describe('github issues > #7401 MongoDB replica set connection string not support with method "parseConnectionUrl" & "buildConnectionUrl"', () => {
	it('should parse replicaSet and host list in ConnectionUrl', () => {
		const options = DriverUtils.buildMongoDBDriverOptions({
			url: 'mongodb://testuser:testpwd@test-primary.example.com:27017,test-secondary-1.example.com:27017,test-secondary-2.example.com:27017/testdb?replicaSet=testreplicaset',
		});

		expect(options.hostReplicaSet ? (options.hostReplicaSet as string) : '').to.equal(
			'test-primary.example.com:27017,test-secondary-1.example.com:27017,test-secondary-2.example.com:27017',
		);
		expect(options.username ? (options.username as string) : '').to.equal('testuser');
		expect(options.password ? (options.password as string) : '').to.equal('testpwd');
		expect(options.database ? (options.database as string) : '').to.equal('testdb');
		expect(options.replicaSet ? (options.replicaSet as string) : '').to.equal('testreplicaset');
	});
});
