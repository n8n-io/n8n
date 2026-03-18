import type { SamlAcsDto, SamlPreferences } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { AuthIdentity, AuthIdentityRepository, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/db';
import { randomString } from 'n8n-workflow';
import type { FlowResult } from 'samlify/types/src/flow';

import { AuthError } from '@/errors/response-errors/auth.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { PasswordUtility } from '@/services/password.utility';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { getServiceProviderConfigTestReturnUrl } from './service-provider.ee';
import type { SamlAttributeMapping, SamlUserAttributes } from './types';

// can only toggle between email and saml, not directly to e.g. ldap
export async function setSamlLoginEnabled(enabled: boolean): Promise<void> {
	const currentAuthenticationMethod = getCurrentAuthenticationMethod();
	if (enabled && !isEmailCurrentAuthenticationMethod() && !isSamlCurrentAuthenticationMethod()) {
		throw new InternalServerError(
			`Cannot switch SAML login enabled state when an authentication method other than email or saml is active (current: ${currentAuthenticationMethod})`,
		);
	}

	const targetAuthenticationMethod =
		!enabled && currentAuthenticationMethod === 'saml' ? 'email' : currentAuthenticationMethod;

	Container.get(GlobalConfig).sso.saml.loginEnabled = enabled;
	await setCurrentAuthenticationMethod(enabled ? 'saml' : targetAuthenticationMethod);
}

export function setSamlLoginLabel(label: string): void {
	Container.get(GlobalConfig).sso.saml.loginLabel = label;
}

export const isSamlPreferences = (candidate: unknown): candidate is SamlPreferences => {
	const o = candidate as SamlPreferences;
	return (
		typeof o === 'object' &&
		typeof o.metadata === 'string' &&
		typeof o.mapping === 'object' &&
		o.mapping !== null &&
		o.loginEnabled !== undefined
	);
};

export async function createUserFromSamlAttributes(
	attributes: SamlUserAttributes,
	afterCreate?: (user: User, trx: EntityManager) => Promise<void>,
): Promise<User> {
	const randomPassword = randomString(18);
	const userRepository = Container.get(UserRepository);
	return await userRepository.manager.transaction(async (trx) => {
		const { user } = await userRepository.createUserWithProject(
			{
				email: attributes.email.toLowerCase(),
				firstName: attributes.firstName,
				lastName: attributes.lastName,
				role: { slug: 'global:member' },
				// generates a password that is not used or known to the user
				password: await Container.get(PasswordUtility).hash(randomPassword),
			},
			trx,
		);

		await trx.save(
			trx.create(AuthIdentity, {
				providerId: attributes.userPrincipalName,
				providerType: 'saml',
				userId: user.id,
			}),
		);

		if (afterCreate) await afterCreate(user, trx);

		return user;
	});
}

export async function updateUserFromSamlAttributes(
	user: User,
	attributes: SamlUserAttributes,
	trx?: EntityManager,
): Promise<User> {
	if (!attributes.email) throw new AuthError('Email is required to update user');
	if (!user) throw new AuthError('User not found');
	let samlAuthIdentity = user?.authIdentities.find((e) => e.providerType === 'saml');
	if (!samlAuthIdentity) {
		samlAuthIdentity = new AuthIdentity();
		samlAuthIdentity.providerId = attributes.userPrincipalName;
		samlAuthIdentity.providerType = 'saml';
		samlAuthIdentity.user = user;
		user.authIdentities.push(samlAuthIdentity);
	} else {
		samlAuthIdentity.providerId = attributes.userPrincipalName;
	}
	const em = trx ?? Container.get(AuthIdentityRepository).manager;
	await em.save(AuthIdentity, samlAuthIdentity);
	user.firstName = attributes.firstName;
	user.lastName = attributes.lastName;
	const resultUser = await em.save(User, user);
	if (!resultUser) throw new AuthError('Could not update User');
	const userWithRole = await em.findOne(User, {
		where: { id: resultUser.id },
		relations: ['role'],
	});
	if (!userWithRole) throw new AuthError('Failed to fetch user!');
	return userWithRole;
}

type GetMappedSamlReturn = {
	attributes: SamlUserAttributes | undefined;
	missingAttributes: string[];
};

export function getMappedSamlAttributesFromFlowResult(
	flowResult: FlowResult,
	attributeMapping: SamlAttributeMapping,
	jitClaimNames: {
		instanceRole: string | null;
		projectRoles: string | null;
	},
): GetMappedSamlReturn {
	const result: GetMappedSamlReturn = {
		attributes: undefined,
		missingAttributes: [] as string[],
	};
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (flowResult?.extract?.attributes) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const attributes = flowResult.extract.attributes as { [key: string]: string | string[] };
		// TODO:SAML: fetch mapped attributes from flowResult.extract.attributes and create or login user
		const email = attributes[attributeMapping.email] as string;
		const firstName = attributes[attributeMapping.firstName] as string;
		const lastName = attributes[attributeMapping.lastName] as string;
		const userPrincipalName = attributes[attributeMapping.userPrincipalName] as string;

		result.attributes = {
			email,
			firstName,
			lastName,
			userPrincipalName,
		};
		if (jitClaimNames.instanceRole && typeof attributes[jitClaimNames.instanceRole] === 'string') {
			result.attributes.n8nInstanceRole = attributes[jitClaimNames.instanceRole] as string;
		}
		if (jitClaimNames.projectRoles && attributes[jitClaimNames.projectRoles]) {
			const projectRolesFromFlowResult = attributes[jitClaimNames.projectRoles];
			result.attributes.n8nProjectRoles = Array.isArray(projectRolesFromFlowResult)
				? projectRolesFromFlowResult
				: [projectRolesFromFlowResult];
		}
		if (!email) result.missingAttributes.push(attributeMapping.email);
		if (!userPrincipalName) result.missingAttributes.push(attributeMapping.userPrincipalName);
		if (!firstName) result.missingAttributes.push(attributeMapping.firstName);
		if (!lastName) result.missingAttributes.push(attributeMapping.lastName);
	}
	return result;
}

export function isConnectionTestRequest(payload: SamlAcsDto): boolean {
	return payload.RelayState === getServiceProviderConfigTestReturnUrl();
}
