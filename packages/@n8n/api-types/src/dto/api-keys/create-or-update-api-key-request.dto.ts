import xss from 'xss';
import { z } from 'zod';
import { Z } from 'zod-class';

const xssCheck = (value: string) =>
	value ===
	xss(value, {
		whiteList: {},
	});

const isTimeNotDefinedOrInFuture = (value?: number) => {
	if (!value) return true;
	return value > Date.now() / 1000;
};

export class CreateOrUpdateApiKeyRequestDto extends Z.class({
	label: z.string().max(50).min(1).refine(xssCheck),
	/** expirationUnixTimestamp is ignored when updating */
	expirationUnixTimestamp: z
		.number()
		.optional()
		.refine(isTimeNotDefinedOrInFuture, { message: 'Expiration date must be in the future' }),
}) {}
