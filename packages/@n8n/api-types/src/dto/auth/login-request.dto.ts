import { z } from 'zod';
import { Z } from 'zod-class';

export class LoginRequestDto extends Z.class({
	/*
	 * The LDAP username does not need to be an email, so email validation
	 * is not enforced here. The controller determines whether this is an
	 * email and validates when LDAP is disabled
	 */
	emailOrLdapLoginId: z.string().trim(),
	password: z.string().min(1),
	mfaCode: z.string().optional(),
	mfaRecoveryCode: z.string().optional(),
}) {}
