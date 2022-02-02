import { randomBytes } from 'crypto';
import express = require('express');
import * as superagent from 'superagent';
import * as request from 'supertest';
import { URL } from 'url';
import bodyParser = require('body-parser');

import config = require('../../config');
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT } from './constants';
import { addRoutes as authMiddleware } from '../../src/UserManagement/routes';
import { Db } from '../../src';
import { User } from '../../src/databases/entities/User';
import { meNamespace as meEndpoints } from '../../src/UserManagement/routes/me';
import { usersNamespace as usersEndpoints } from '../../src/UserManagement/routes/users';
import { getConnection } from 'typeorm';
import { issueJWT } from '../../src/UserManagement/auth/jwt';

export const isTestRun = process.argv[1].split('/').includes('jest');

export const MIN_PASSWORD_LENGTH = 8;

export const MAX_PASSWORD_LENGTH = 64;

const POPULAR_TOP_LEVEL_DOMAINS = ['com', 'org', 'net', 'io', 'edu'];

export const initTestServer = (namespaces: { [K in 'me' | 'users']?: true } = {}) => {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', 'My JWT secret');
	config.set('userManagement.hasOwner', false);

	authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);

	if (namespaces.me) meEndpoints.apply(testServer);
	if (namespaces.users) usersEndpoints.apply(testServer);

	return testServer.app;
};

export async function initTestDb() {
	await Db.init();
	await getConnection().runMigrations({ transaction: 'none' });
}

export async function truncateUserTable() {
	await getConnection().query('PRAGMA foreign_keys=OFF');
	await Db.collections.User!.clear();
	await getConnection().query('PRAGMA foreign_keys=ON');
}

export async function createAgent(app: express.Application, user: User) {
	const agent = request.agent(app);
	agent.use(prefix(REST_PATH_SEGMENT));

	const { token } = await issueJWT(user);
	agent.jar.setCookie(`n8n-auth=${token}`);

	return agent;
}

/**
 * Plugin to prefix a path segment into a request URL pathname.
 *
 * Example:
 * http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
export function prefix(pathSegment: string) {
	return function (request: superagent.SuperAgentRequest) {
		const url = new URL(request.url);

		// enforce consistency at call sites
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();

		return request;
	};
}

/**
 * Create a random string of random length between two limits, both inclusive.
 */
export function randomString(min: number, max: number) {
	const randomInteger = Math.floor(Math.random() * (max - min) + min) + 1;
	return randomBytes(randomInteger / 2).toString('hex');
}

const chooseRandomly = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

export const randomValidPassword = () => randomString(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH);

export const randomInvalidPassword = () =>
	chooseRandomly([
		randomString(1, MIN_PASSWORD_LENGTH - 1),
		randomString(MAX_PASSWORD_LENGTH + 1, 100),
	]);

export const randomEmail = () => `${randomName()}@${randomName()}.${randomTopLevelDomain()}`;

const randomTopLevelDomain = () => chooseRandomly(POPULAR_TOP_LEVEL_DOMAINS);

export const randomName = () => randomString(3, 7);
