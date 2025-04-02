/* eslint-disable @typescript-eslint/no-invalid-void-type */

import { Container } from '@n8n/di';
import type express from 'express';
import { validate } from 'jsonschema';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';

import { toJsonSchema } from './credentials.service';
import type { CredentialRequest } from '../../../types';

export const validCredentialType = (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	try {
		Container.get(CredentialTypes).getByName(req.body.type);
	} catch {
		return res.status(400).json({ message: 'req.body.type is not a known type' });
	}

	return next();
};

export const validCredentialsProperties = (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	const { type, data } = req.body;

	const properties = Container.get(CredentialsHelper)
		.getCredentialsProperties(type)
		.filter((property) => property.type !== 'hidden');

	const schema = toJsonSchema(properties);

	const { valid, errors } = validate(data, schema, { nestedErrors: true });

	if (!valid) {
		return res.status(400).json({
			message: errors.map((error) => `request.body.data ${error.message}`).join(','),
		});
	}

	return next();
};
