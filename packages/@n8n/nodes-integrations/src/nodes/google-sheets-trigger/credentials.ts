import { t } from '@n8n/node-sdk';
import { defineCredential, field } from '@n8n/node-sdk/credentials';

import { googleOAuth2 } from '../google-oauth2';

export const googleSheetsTriggerOAuth2 = googleOAuth2({
	id: 'googleSheetsTrigger.oauth2',
	legacyName: 'googleSheetsTriggerOAuth2Api',
	displayName: 'Google Sheets Trigger OAuth2 API',
	scope: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	],
	notice:
		'Make sure you have enabled the following APIs & Services in the Google Cloud Console: Google Drive API, Google Sheets API. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
});

const REGIONS = [
	['africa-south1', 'Africa', 'Johannesburg'],
	['asia-east1', 'Asia Pacific', 'Changhua County'],
	['asia-east2', 'Asia Pacific', 'Hong Kong'],
	['asia-northeast1', 'Asia Pacific', 'Tokyo'],
	['asia-northeast2', 'Asia Pacific', 'Osaka'],
	['asia-northeast3', 'Asia Pacific', 'Seoul'],
	['asia-south1', 'Asia Pacific', 'Mumbai'],
	['asia-south2', 'Asia Pacific', 'Delhi'],
	['asia-southeast1', 'Asia Pacific', 'Jurong West'],
	['asia-southeast2', 'Asia Pacific', 'Jakarta'],
	['australia-southeast1', 'Asia Pacific', 'Sydney'],
	['australia-southeast2', 'Asia Pacific', 'Melbourne'],
	['europe-central2', 'Europe', 'Warsaw'],
	['europe-north1', 'Europe', 'Hamina'],
	['europe-southwest1', 'Europe', 'Madrid'],
	['europe-west1', 'Europe', 'St. Ghislain'],
	['europe-west10', 'Europe', 'Berlin'],
	['europe-west12', 'Europe', 'Turin'],
	['europe-west2', 'Europe', 'London'],
	['europe-west3', 'Europe', 'Frankfurt'],
	['europe-west4', 'Europe', 'Eemshaven'],
	['europe-west6', 'Europe', 'Zurich'],
	['europe-west8', 'Europe', 'Milan'],
	['europe-west9', 'Europe', 'Paris'],
	['me-central1', 'Middle East', 'Doha'],
	['me-central2', 'Middle East', 'Dammam'],
	['me-west1', 'Middle East', 'Tel Aviv'],
	['northamerica-northeast1', 'Americas', 'Montréal'],
	['northamerica-northeast2', 'Americas', 'Toronto'],
	['northamerica-south1', 'Americas', 'Queretaro'],
	['southamerica-east1', 'Americas', 'Osasco'],
	['southamerica-west1', 'Americas', 'Santiago'],
	['us-central1', 'Americas', 'Council Bluffs'],
	['us-east1', 'Americas', 'Moncks Corner'],
	['us-east4', 'Americas', 'Ashburn'],
	['us-east5', 'Americas', 'Columbus'],
	['us-south1', 'Americas', 'Dallas'],
	['us-west1', 'Americas', 'The Dalles'],
	['us-west2', 'Americas', 'Los Angeles'],
	['us-west3', 'Americas', 'Salt Lake City'],
	['us-west4', 'Americas', 'Las Vegas'],
] as const;

export const googleServiceAccount = defineCredential({
	id: 'google.serviceAccount',
	version: '1.0.0',
	legacyName: 'googleApi',
	displayName: 'Google Service Account API',
	docs: 'google/service-account',
	fields: {
		region: field
			.options('Region', {
				// Newer Gemini models (e.g. Gemini 3.x) are only served from `global` or the
				// `eu`/`us` multi-region locations, not individual regions, so list them first.
				global: { name: 'Global (multi-region) - global' },
				eu: { name: 'EU (multi-region) - eu' },
				us: { name: 'US (multi-region) - us' },
				...Object.fromEntries(
					REGIONS.map(([name, area, location]) => [
						name,
						{ name: `${area} (${location}) - ${name}` },
					]),
				),
			})
			// Global is the only location that serves both Gemini 2.x and 3.x models.
			.default('global')
			.describe(
				'The region where the Google Cloud service is located. This applies only to specific nodes, like the Google Vertex Chat Model',
			),
		email: field
			.text('Service Account Email')
			.describe('The Google Service account similar to user-808@project.iam.gserviceaccount.com'),
		privateKey: field
			.secret('Private Key')
			.describe(
				'Enter the private key located in the JSON file downloaded from Google Cloud Console',
			),
		inpersonate: t.bool().default(false).title('Impersonate a User'),
		delegatedEmail: field
			.text('Email')
			.optional()
			.describe(
				'The email address of the user for which the application is requesting delegated access',
			),
		httpNode: t.bool().default(false).title('Set up for use in HTTP Request node'),
		scopes: field
			.text('Scope(s)')
			.optional()
			.describe(
				'You can find the scopes for services <a href="https://developers.google.com/identity/protocols/oauth2/scopes" target="_blank">here</a>',
			),
	},
	when: { delegatedEmail: { inpersonate: true }, scopes: { httpNode: true } },
	auth: (a) =>
		a.oauth2.jwtBearer({
			tokenEndpoint: 'https://oauth2.googleapis.com/token',
			key: 'privateKey',
			claims: { iss: '{email}', sub: '{email}' },
		}),
	// Legacy nodes add their own scopes and token. n8n signs only for the HTTP Request node.
	derive: ({ email, delegatedEmail, httpNode, scopes = '' }) =>
		httpNode
			? {
					claims: {
						iss: email.trim(),
						sub: delegatedEmail || email.trim(),
						scope: scopes
							.replace(/\\n/g, '\n')
							.split(/[,\s]+/)
							.filter((scope) => scope !== '')
							.join(' '),
					},
				}
			: {},
	notice: {
		text: "When using the HTTP Request node, you must specify the scopes you want to send. In other nodes, they're added automatically",
		when: { httpNode: true },
	},
});
