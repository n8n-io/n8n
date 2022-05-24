/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable consistent-return */
import { RequestHandler } from 'express';
import { validate } from 'jsonschema';
import { CredentialsHelper, CredentialTypes } from '../../../..';
import { CredentialRequest } from '../../../types';
import { toJsonSchema } from './credentials.service';

export const validCredentialType: RequestHandler = async (
	req: CredentialRequest.Create,
	res,
	next,
): Promise<any> => {
	const { type } = req.body;
	try {
		CredentialTypes().getByName(type);
	} catch (error) {
		return res.status(400).json({
			message: 'req.body.type is not a known type',
		});
	}
	next();
};

export const validCredentialsProperties: RequestHandler = async (
	req: CredentialRequest.Create,
	res,
	next,
): Promise<any> => {
	const { type, data } = req.body;

	let properties = new CredentialsHelper('').getCredentialsProperties(type);

	properties = properties.filter((nodeProperty) => nodeProperty.type !== 'hidden');

	const schema = toJsonSchema(properties);

	const { valid, errors } = validate(data, schema, { nestedErrors: true });

	if (!valid) {
		return res.status(400).json({
			message: errors.map((error) => `request.body.data ${error.message}`).join(','),
		});
	}

	next();
};
