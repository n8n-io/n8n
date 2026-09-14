import type { ICredentialType } from 'n8n-workflow';

import { GmailOAuth2Api } from '../GmailOAuth2Api.credentials';
import { GoogleAdsOAuth2Api } from '../GoogleAdsOAuth2Api.credentials';
import { GoogleAnalyticsOAuth2Api } from '../GoogleAnalyticsOAuth2Api.credentials';
import { GoogleBooksOAuth2Api } from '../GoogleBooksOAuth2Api.credentials';
import { GoogleBusinessProfileOAuth2Api } from '../GoogleBusinessProfileOAuth2Api.credentials';
import { GoogleChatOAuth2Api } from '../GoogleChatOAuth2Api.credentials';
import { GoogleCloudNaturalLanguageOAuth2Api } from '../GoogleCloudNaturalLanguageOAuth2Api.credentials';
import { GoogleContactsOAuth2Api } from '../GoogleContactsOAuth2Api.credentials';
import { GoogleDocsOAuth2Api } from '../GoogleDocsOAuth2Api.credentials';
import { GoogleDriveOAuth2Api } from '../GoogleDriveOAuth2Api.credentials';
import { GoogleFirebaseCloudFirestoreOAuth2Api } from '../GoogleFirebaseCloudFirestoreOAuth2Api.credentials';
import { GoogleFirebaseRealtimeDatabaseOAuth2Api } from '../GoogleFirebaseRealtimeDatabaseOAuth2Api.credentials';
import { GooglePerspectiveOAuth2Api } from '../GooglePerspectiveOAuth2Api.credentials';
import { GoogleSheetsTriggerOAuth2Api } from '../GoogleSheetsTriggerOAuth2Api.credentials';
import { GoogleSlidesOAuth2Api } from '../GoogleSlidesOAuth2Api.credentials';
import { GoogleTasksOAuth2Api } from '../GoogleTasksOAuth2Api.credentials';
import { GoogleTranslateOAuth2Api } from '../GoogleTranslateOAuth2Api.credentials';
import { GSuiteAdminOAuth2Api } from '../GSuiteAdminOAuth2Api.credentials';
import { YouTubeOAuth2Api } from '../YouTubeOAuth2Api.credentials';

// prettier-ignore
const CASES: Array<[string, ICredentialType, string]> = [
	[
		'gmailOAuth2',
		new GmailOAuth2Api(),
		'https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.addons.current.message.action https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose',
	],
	[
		'gSuiteAdminOAuth2Api',
		new GSuiteAdminOAuth2Api(),
		'https://www.googleapis.com/auth/admin.directory.group https://www.googleapis.com/auth/admin.directory.user https://www.googleapis.com/auth/admin.directory.domain.readonly https://www.googleapis.com/auth/admin.directory.userschema.readonly https://www.googleapis.com/auth/admin.directory.device.chromeos https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
	],
	['googleAdsOAuth2Api', new GoogleAdsOAuth2Api(), 'https://www.googleapis.com/auth/adwords'],
	[
		'googleAnalyticsOAuth2',
		new GoogleAnalyticsOAuth2Api(),
		'https://www.googleapis.com/auth/analytics https://www.googleapis.com/auth/analytics.readonly',
	],
	['googleBooksOAuth2Api', new GoogleBooksOAuth2Api(), 'https://www.googleapis.com/auth/books'],
	[
		'googleBusinessProfileOAuth2Api',
		new GoogleBusinessProfileOAuth2Api(),
		'https://www.googleapis.com/auth/business.manage',
	],
	[
		'googleChatOAuth2Api',
		new GoogleChatOAuth2Api(),
		'https://www.googleapis.com/auth/chat.spaces https://www.googleapis.com/auth/chat.messages https://www.googleapis.com/auth/chat.memberships',
	],
	[
		'googleCloudNaturalLanguageOAuth2Api',
		new GoogleCloudNaturalLanguageOAuth2Api(),
		'https://www.googleapis.com/auth/cloud-language https://www.googleapis.com/auth/cloud-platform',
	],
	[
		'googleContactsOAuth2Api',
		new GoogleContactsOAuth2Api(),
		'https://www.googleapis.com/auth/contacts',
	],
	[
		'googleDocsOAuth2Api',
		new GoogleDocsOAuth2Api(),
		'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
	],
	[
		'googleDriveOAuth2Api',
		new GoogleDriveOAuth2Api(),
		'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.photos.readonly',
	],
	[
		'googleFirebaseCloudFirestoreOAuth2Api',
		new GoogleFirebaseCloudFirestoreOAuth2Api(),
		'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
	],
	[
		'googleFirebaseRealtimeDatabaseOAuth2Api',
		new GoogleFirebaseRealtimeDatabaseOAuth2Api(),
		'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/firebase',
	],
	[
		'googlePerspectiveOAuth2Api',
		new GooglePerspectiveOAuth2Api(),
		'https://www.googleapis.com/auth/userinfo.email',
	],
	[
		'googleSheetsTriggerOAuth2Api',
		new GoogleSheetsTriggerOAuth2Api(),
		'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata',
	],
	[
		'googleSlidesOAuth2Api',
		new GoogleSlidesOAuth2Api(),
		'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations',
	],
	['googleTasksOAuth2Api', new GoogleTasksOAuth2Api(), 'https://www.googleapis.com/auth/tasks'],
	[
		'googleTranslateOAuth2Api',
		new GoogleTranslateOAuth2Api(),
		'https://www.googleapis.com/auth/cloud-translation',
	],
	[
		'youTubeOAuth2Api',
		new YouTubeOAuth2Api(),
		'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtubepartner https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtubepartner-channel-audit',
	],
];

describe.each(CASES)('%s custom scopes', (name, credential, defaultScopes) => {
	const property = (propertyName: string) =>
		credential.properties.find((p) => p.name === propertyName);

	it('should keep its metadata and extend the google credential', () => {
		expect(credential.name).toBe(name);
		expect(credential.extends).toEqual(['googleOAuth2Api']);
	});

	it('should offer custom scopes prefilled with the defaults', () => {
		expect(property('customScopes')?.type).toBe('boolean');
		expect(property('customScopes')?.default).toBe(false);
		expect(property('customScopesNotice')?.displayOptions).toEqual({
			show: { customScopes: [true] },
		});
		expect(property('enabledScopes')?.displayOptions).toEqual({ show: { customScopes: [true] } });
		expect(property('enabledScopes')?.default).toBe(defaultScopes);
	});

	it('should keep the scope hidden and default to the standard scopes when custom scopes are off', () => {
		expect(property('scope')?.type).toBe('hidden');
		expect(property('scope')?.default).toBe(
			`={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes}"}}`,
		);
	});
});
