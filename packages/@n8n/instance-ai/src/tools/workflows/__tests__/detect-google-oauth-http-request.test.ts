import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';

import { detectGoogleOAuthHttpRequest } from '../detect-google-oauth-http-request';

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

function workflow(
	parameters: Record<string, unknown>,
	type = HTTP_REQUEST,
	name = 'Create Google Doc',
): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name,
				type,
				typeVersion: 4.2,
				position: [0, 0],
				parameters: parameters as IDataObject,
			},
		],
		connections: {},
	};
}

function predefinedAuth(nodeCredentialType: unknown) {
	return {
		url: 'https://www.googleapis.com/upload/drive/v3/files',
		authentication: 'predefinedCredentialType',
		nodeCredentialType,
	};
}

describe('detectGoogleOAuthHttpRequest', () => {
	it('flags an HTTP Request node that authenticates with a Google Drive OAuth credential', () => {
		const warnings = detectGoogleOAuthHttpRequest(workflow(predefinedAuth('googleDriveOAuth2Api')));

		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('GOOGLE_OAUTH_HTTP_REQUEST');
		expect(warnings[0].nodeName).toBe('Create Google Doc');
		expect(warnings[0].message).toContain('googleDriveOAuth2Api');
	});

	it('is informational so it never blocks the save', () => {
		const [warning] = detectGoogleOAuthHttpRequest(
			workflow(predefinedAuth('googleDriveOAuth2Api')),
		);

		expect(warning.severity).toBe('informational');
	});

	it('tells the builder to use the native node or state the limit to the user', () => {
		const [warning] = detectGoogleOAuthHttpRequest(
			workflow(predefinedAuth('googleDriveOAuth2Api')),
		);

		expect(warning.message).toMatch(/dedicated Google node/i);
		expect(warning.message).toMatch(/tell the user/i);
		expect(warning.message).toMatch(/n8n Cloud/);
	});

	it.each([
		'googleSheetsOAuth2Api',
		'googleDocsOAuth2Api',
		'googleDriveOAuth2Api',
		'googleCalendarOAuth2Api',
		'gmailOAuth2',
	])('flags %s', (credentialType) => {
		expect(detectGoogleOAuthHttpRequest(workflow(predefinedAuth(credentialType)))).toHaveLength(1);
	});

	it('does not flag the generic Google OAuth credential meant for HTTP Request', () => {
		expect(detectGoogleOAuthHttpRequest(workflow(predefinedAuth('googleOAuth2Api')))).toEqual([]);
	});

	it('does not flag non-Google predefined credentials', () => {
		expect(detectGoogleOAuthHttpRequest(workflow(predefinedAuth('slackOAuth2Api')))).toEqual([]);
	});

	it('does not flag HTTP Request nodes with other authentication modes', () => {
		const params = { url: 'https://www.googleapis.com/x', authentication: 'none' };

		expect(detectGoogleOAuthHttpRequest(workflow(params))).toEqual([]);
	});

	it('does not flag a native Google node that uses the same credential type', () => {
		const warnings = detectGoogleOAuthHttpRequest(
			workflow(predefinedAuth('googleDriveOAuth2Api'), 'n8n-nodes-base.googleDrive'),
		);

		expect(warnings).toEqual([]);
	});

	it('ignores a non-string nodeCredentialType', () => {
		expect(detectGoogleOAuthHttpRequest(workflow(predefinedAuth(undefined)))).toEqual([]);
		expect(detectGoogleOAuthHttpRequest(workflow(predefinedAuth(42)))).toEqual([]);
	});

	it('reports every offending node', () => {
		const json = workflow(predefinedAuth('googleDriveOAuth2Api'));
		json.nodes.push({
			...json.nodes[0],
			id: '2',
			name: 'Read Sheet',
			parameters: predefinedAuth('googleSheetsOAuth2Api') as IDataObject,
		});

		expect(detectGoogleOAuthHttpRequest(json).map((w) => w.nodeName)).toEqual([
			'Create Google Doc',
			'Read Sheet',
		]);
	});
});
