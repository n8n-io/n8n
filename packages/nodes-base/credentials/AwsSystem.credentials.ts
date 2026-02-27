import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { CredentialsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import type { AwsSystemCredentialsType, AWSRegion } from './common/aws/types';
import {
	awsGetSignInOptionsAndUpdateRequest,
	signOptions,
} from './common/aws/utils';
import { awsCustomEndpoints, awsRegionProperty } from './common/aws/descriptions';

export class AwsSystem implements ICredentialType {
	name = 'awsSystem';

	displayName = 'AWS (System)';

	documentationUrl = 'awssystem';

	icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' } as const;

	properties: INodeProperties[] = [
		awsRegionProperty,
		...awsCustomEndpoints,
	];

	async authenticate(
		rawCredentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentials = rawCredentials as AwsSystemCredentialsType;
		const service = requestOptions.qs?.service as string;
		const path = (requestOptions.qs?.path as string) ?? '';
		const method = requestOptions.method;

		let region = credentials.region;
		if (requestOptions.qs?._region) {
			region = requestOptions.qs._region as AWSRegion;
			delete requestOptions.qs._region;
		}

		const { signOpts, url } = awsGetSignInOptionsAndUpdateRequest(
			requestOptions,
			credentials,
			path,
			method,
			service,
			region,
		);

		const securityHeaders = await AwsSystem.getSecurityHeaders(credentials);
		return signOptions(requestOptions, signOpts, securityHeaders, url, method);
	}

	static async getSecurityHeaders(credentials: AwsSystemCredentialsType): Promise<AwsCredentialIdentity> {
		const provider = AwsSystem.getCredentialProvider(credentials);
		return await provider();
	}

	static getCredentialProvider(credentials: AwsSystemCredentialsType): AwsCredentialIdentityProvider {
		if (!Container.get(CredentialsConfig).allowSystems) {
			throw new ApplicationError(
				"CREDENTIALS_ALLOW_SYSTEMS must be enable to use system's credentials",
			);
		}

		return fromNodeProviderChain({
			clientConfig: {
				region: credentials.region,
			},
		});
	}
}
