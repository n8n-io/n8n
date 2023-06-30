/* eslint-disable @typescript-eslint/no-invalid-void-type */

import type express from 'express';
import { validate } from 'jsonschema';

import { CredentialsHelper } from '@/CredentialsHelper';
import { CredentialTypes } from '@/CredentialTypes';
import type { CredentialRequest } from '../../../types';
import { toJsonSchema } from './credentials.service';
import { Container } from 'typedi';

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

	const properties = new CredentialsHelper('')
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
