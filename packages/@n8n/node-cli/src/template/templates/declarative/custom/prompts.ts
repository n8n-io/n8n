import { select, text } from '@clack/prompts';

import type { CredentialType } from './types';
import { withCancelHandler } from '../../../../utils/prompts';

export const credentialTypePrompt = async () =>
	await withCancelHandler(
		select<CredentialType>({
			message: 'What type of authentication does your API use?',
			options: [
				{
					label: 'API Key',
					value: 'apiKey',
					hint: 'Send a secret key via headers, query, or body',
				},
				{
					label: 'Bearer Token',
					value: 'bearer',
					hint: 'Send a token via Authorization header (Authorization: Bearer <token>)',
				},
				{
					label: 'OAuth2',
					value: 'oauth2',
					hint: 'Use an OAuth 2.0 flow to obtain access tokens on behalf of a user or app',
				},
				{
					label: 'Basic Auth',
					value: 'basicAuth',
					hint: 'Send username and password encoded in base64 via the Authorization header',
				},
				{
					label: 'Custom',
					value: 'custom',
					hint: 'Create your own credential logic; an empty credential class will be scaffolded for you',
				},
				{
					label: 'None',
					value: 'none',
					hint: 'No authentication; no credential class will be generated',
				},
			],
			initialValue: 'apiKey',
		}),
	);

export const baseUrlPrompt = async () =>
	await withCancelHandler(
		text({
			message: "What's the base URL of the API?",
			placeholder: 'https://api.example.com/v2',
			defaultValue: 'https://api.example.com/v2',
			validate: (value) => {
				if (!value) return;

				if (!value.startsWith('https://') && !value.startsWith('http://')) {
					return 'Base URL must start with http(s)://';
				}

				try {
					new URL(value);
				} catch (error) {
					return 'Must be a valid URL';
				}
				return;
			},
		}),
	);

export const oauthFlowPrompt = async () =>
	await withCancelHandler(
		select<'clientCredentials' | 'authorizationCode'>({
			message: 'What OAuth2 flow does your API use?',
			options: [
				{
					label: 'Authorization code',
					value: 'authorizationCode',
					hint: 'Users log in and approve access (use this if unsure)',
				},
				{
					label: 'Client credentials',
					value: 'clientCredentials',
					hint: 'Server-to-server auth without user interaction',
				},
			],
			initialValue: 'authorizationCode',
		}),
	);
