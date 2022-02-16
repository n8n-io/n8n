import express = require('express');
import { getConnection } from 'typeorm';

import { Db } from '../../src';
import { randomName, randomString } from './shared/random';
import * as utils from './shared/utils';

let app: express.Application;

beforeAll(async () => {
	app = utils.initTestServer({
		namespaces: ['credentials'],
		applyAuth: true,
		externalHooks: true,
	});
	await utils.initTestDb();
});

beforeEach(async () => {
	await utils.createOwnerShell();
});

afterEach(async () => {
	await utils.truncate(['User', 'Credentials']);
});

afterAll(() => {
	return getConnection().close();
});

test('POST /credentials should create a credential', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.post('/credentials').send(CREATE_CRED_PAYLOAD);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: hashedData } = response.body.data;

	expect(id).toBe('1');
	expect(name).toBe(CREATE_CRED_PAYLOAD.name);
	expect(type).toBe(CREATE_CRED_PAYLOAD.type);
	expect(nodesAccess[0].nodeType).toBe(CREATE_CRED_PAYLOAD.nodesAccess[0].nodeType);
	expect(hashedData).not.toBe(CREATE_CRED_PAYLOAD.data);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.id).toBe(1);
	expect(credential.name).toBe(CREATE_CRED_PAYLOAD.name);
	expect(credential.type).toBe(CREATE_CRED_PAYLOAD.type);
	expect(credential.nodesAccess[0].nodeType).toBe(CREATE_CRED_PAYLOAD.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(CREATE_CRED_PAYLOAD.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.user.id).toBe(shell.id);
	expect(sharedCredential.credentials.name).toBe(CREATE_CRED_PAYLOAD.name);
});

test('POST /credentials should fail with invalid inputs', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const invalidPayloads = [
		{
			type: randomName(),
			nodesAccess: [{ nodeType: randomName() }],
			data: { accessToken: randomString(5, 15) },
		},
		{
			name: randomName(),
			nodesAccess: [{ nodeType: randomName() }],
			data: { accessToken: randomString(5, 15) },
		},
		{
			name: randomName(),
			type: randomName(),
			data: { accessToken: randomString(5, 15) },
		},
		{
			name: randomName(),
			type: randomName(),
			nodesAccess: [{ nodeType: randomName() }],
		},
		{},
		[],
		undefined,
	];

	for (const invalidPayload of invalidPayloads) {
		const response = await authShellAgent.post('/credentials').send(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

test('POST /credentials should fail with missing encryption key', async () => {
	const { UserSettings } = require('n8n-core');
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockReturnValue(undefined);

	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.post('/credentials').send(CREATE_CRED_PAYLOAD);

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('POST /credentials should ignore ID in payload', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const firstResponse = await authShellAgent
		.post('/credentials')
		.send({ id: '8', ...CREATE_CRED_PAYLOAD });

	expect(firstResponse.body.data.id).not.toBe('8');

	const secondResponse = await authShellAgent
		.post('/credentials')
		.send({ id: 8, ...CREATE_CRED_PAYLOAD });

	expect(secondResponse.body.data.id).not.toBe(8);
});

const CREATE_CRED_PAYLOAD = {
	name: randomName(),
	type: randomName(),
	nodesAccess: [{ nodeType: randomName() }],
	data: { accessToken: randomString(5, 15) },
};
