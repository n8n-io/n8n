import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CredentialNotFoundError, credentialEntryData, fileCredentialStore } from '../credentials';

describe('credentialEntryData', () => {
	it('reads the data of an entry in the new form', () => {
		expect(
			credentialEntryData({
				type: 'slackApi',
				data: { accessToken: 'fake-token' },
				inject: { headers: { Authorization: 'Bearer {{$credentials.accessToken}}' } },
			}),
		).toEqual({ accessToken: 'fake-token' });
	});

	it('reads an entry in the new form without inject', () => {
		expect(credentialEntryData({ type: 'postgres', data: { host: 'db' } })).toEqual({
			host: 'db',
		});
	});

	it('reads an entry in the old form as the data', () => {
		expect(credentialEntryData({ host: 'db', user: 'u' })).toEqual({ host: 'db', user: 'u' });
	});

	it('keeps old-form data that has a "type" field and other fields', () => {
		const data = { type: 'service_account', data: { a: 1 }, email: 'x@example.com' };
		expect(credentialEntryData(data)).toEqual(data);
	});

	it('gives undefined for a missing or non-object entry', () => {
		expect(credentialEntryData(undefined)).toBeUndefined();
		expect(credentialEntryData('text')).toBeUndefined();
		expect(credentialEntryData(['a'])).toBeUndefined();
	});
});

describe('fileCredentialStore', () => {
	let dir: string;
	let file: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'wf-fallback-credentials-'));
		file = join(dir, 'credentials.json');
		writeFileSync(
			file,
			JSON.stringify({
				old: { host: 'db.example.com', password: 'fake' },
				fresh: { type: 'httpHeaderAuth', data: { name: 'X-Key', value: 'fake' }, inject: {} },
			}),
		);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('reads both forms from one file', async () => {
		const store = fileCredentialStore(file);
		expect(await store.get('old')).toEqual({ host: 'db.example.com', password: 'fake' });
		expect(await store.get('fresh')).toEqual({ name: 'X-Key', value: 'fake' });
	});

	it('fails for a slot that is not in the file', async () => {
		await expect(fileCredentialStore(file).get('missing')).rejects.toBeInstanceOf(
			CredentialNotFoundError,
		);
	});

	it('fails when no file is set', async () => {
		await expect(fileCredentialStore(undefined).get('old')).rejects.toThrow(
			'WF_FALLBACK_CREDENTIALS is not set',
		);
	});
});
