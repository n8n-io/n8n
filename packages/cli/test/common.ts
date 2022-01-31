import express = require('express');
import bodyParser = require('body-parser');
import validator from 'validator';
import * as request from 'supertest';

import config = require('../config');
import { Role } from '../src/databases/entities/Role';
import { AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT, TEST_JWT_SECRET } from './constants';
import { addRoutes as authMiddleware } from '../src/UserManagement/routes';
import { authenticationMethods as loginRoutes } from '../src/UserManagement/routes/auth';
import { SUCCESS_RESPONSE_BODY } from './constants';
import { PAYLOADS } from './constants/me';

// ----------------------------------
//          test server
// ----------------------------------

export const initTestServer = () => {
	const testServer = {
		app: express(),
		restEndpoint: REST_PATH_SEGMENT,
	};

	testServer.app.use(bodyParser.json());
	testServer.app.use(bodyParser.urlencoded({ extended: true }));

	config.set('userManagement.jwtSecret', TEST_JWT_SECRET);

	authMiddleware.apply(testServer, [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT]);
	loginRoutes.apply(testServer);

	return testServer;
};

// ----------------------------------
//          expectations
// ----------------------------------

export const patchMe = async (
	requester: request.SuperAgentTest,
	{ expectSurvey }: { expectSurvey: boolean },
) => {
	const response = await requester.patch('/me').send(PAYLOADS.PROFILE);

	expect(response.statusCode).toBe(200);

	const { id, email, firstName, lastName, personalizationAnswers, globalRole } = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(PAYLOADS.PROFILE.email);
	expect(firstName).toBe(PAYLOADS.PROFILE.firstName);
	expect(lastName).toBe(PAYLOADS.PROFILE.lastName);
	expectSurvey
		? expect(personalizationAnswers).toEqual(PAYLOADS.SURVEY)
		: expect(personalizationAnswers).toBeNull();

	expectOwnerGlobalRole(globalRole);
};

export const patchPassword = async (requester: request.SuperAgentTest) => {
	const response = await requester.patch('/me/password').send(PAYLOADS.PASSWORD);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
};

export const postSurvey = async (requester: request.SuperAgentTest) => {
	const response = await requester.post('/me/survey').send(PAYLOADS.SURVEY);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
};

export const expectOwnerGlobalRole = (globalRole: Role) => {
	expect(globalRole.id).toBe(1); // TODO: Will this always be true?
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expectIso8601Date(globalRole.createdAt);
	expectIso8601Date(globalRole.updatedAt);
};

const expectIso8601Date = (date: Date) =>
	expect(validator.isISO8601(date.toString(), { strict: true })).toBe(true);
