/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable consistent-return */
import { RequestHandler } from 'express';
import { CredentialTypes } from '../../../..';
import { CredentialRequest } from '../../../types';
import { validateCredentialsProperties } from './credentials.service';

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
	const formatError = (propertyName: string) => {
		return `request.body.data should have required property '${propertyName}'`;
	};
	const missingProperties = validateCredentialsProperties(type, data);
	if (missingProperties.length) {
		return res.status(400).json({
			message: missingProperties.map(formatError).join(','),
		});
	}
	next();
};
