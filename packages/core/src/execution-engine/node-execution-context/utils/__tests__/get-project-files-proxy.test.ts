import type { IWorkflowExecuteAdditionalData, ProjectFilesSnapshotEntry } from 'n8n-workflow';
import { PROJECT_FILES_URL_PLACEHOLDER } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getProjectFilesProxy } from '../get-project-files-proxy';

describe('getProjectFilesProxy', () => {
	const snapshot: ProjectFilesSnapshotEntry[] = [
		{
			id: 'file-1',
			name: 'logo.png',
			mimeType: 'image/png',
			size: 1234,
			updatedAt: '2026-08-01T12:00:00.000Z',
		},
		{
			id: 'file-2',
			name: 'pricing.csv',
			mimeType: 'text/csv',
			size: 42,
			updatedAt: '2026-08-02T08:30:00.000Z',
		},
	];

	const buildAdditionalData = ({
		withSnapshot = true,
		signToken,
	}: {
		withSnapshot?: boolean;
		signToken?: (fileId: string) => string;
	} = {}) => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		additionalData.restApiUrl = 'https://n8n.test/rest';
		additionalData.projectFilesSnapshot = withSnapshot ? snapshot : undefined;
		additionalData.signProjectFileToken = signToken;
		return additionalData;
	};

	it('should be undefined when no snapshot is present', () => {
		expect(getProjectFilesProxy(buildAdditionalData({ withSnapshot: false }))).toBeUndefined();
	});

	it('should resolve a file by exact name', () => {
		const $files = getProjectFilesProxy(buildAdditionalData());

		const file = $files?.('logo.png');

		expect(file).toMatchObject({
			id: 'file-1',
			name: 'logo.png',
			mimeType: 'image/png',
			size: 1234,
			updatedAt: '2026-08-01T12:00:00.000Z',
		});
	});

	it('should resolve an unknown name to undefined, matching $vars miss behavior', () => {
		const $files = getProjectFilesProxy(buildAdditionalData());

		expect($files?.('missing.csv')).toBeUndefined();
	});

	it('should return every snapshot entry from .all()', () => {
		const $files = getProjectFilesProxy(buildAdditionalData());

		const all = $files?.all() ?? [];

		expect(all).toHaveLength(2);
		expect(all.map((file) => file.name)).toEqual(['logo.png', 'pricing.csv']);
	});

	it('should mint the signed url lazily, only on property access', () => {
		const signToken = vi.fn((fileId: string) => `token-for-${fileId}`);
		const $files = getProjectFilesProxy(buildAdditionalData({ signToken }));

		const file = $files?.('pricing.csv');
		expect(signToken).not.toHaveBeenCalled();

		expect(file?.url).toBe('https://n8n.test/rest/files/signed?token=token-for-file-2');
		expect(signToken).toHaveBeenCalledTimes(1);
		expect(signToken).toHaveBeenCalledWith('file-2');

		// repeated access reuses the minted url
		expect(file?.url).toBe('https://n8n.test/rest/files/signed?token=token-for-file-2');
		expect(signToken).toHaveBeenCalledTimes(1);
	});

	it('should not mint tokens for .all() entries until their url is read', () => {
		const signToken = vi.fn((fileId: string) => `token-for-${fileId}`);
		const $files = getProjectFilesProxy(buildAdditionalData({ signToken }));

		const all = $files?.all() ?? [];
		expect(signToken).not.toHaveBeenCalled();

		expect(all[0].url).toBe('https://n8n.test/rest/files/signed?token=token-for-file-1');
		expect(signToken).toHaveBeenCalledTimes(1);
	});

	it('should url-encode the minted token', () => {
		const signToken = vi.fn(() => 'a+b/c=');
		const $files = getProjectFilesProxy(buildAdditionalData({ signToken }));

		expect($files?.('logo.png')?.url).toBe(
			`https://n8n.test/rest/files/signed?token=${encodeURIComponent('a+b/c=')}`,
		);
	});

	it('should fall back to the placeholder when no signer is available (editor context)', () => {
		const $files = getProjectFilesProxy(buildAdditionalData({ signToken: undefined }));

		expect($files?.('logo.png')?.url).toBe(PROJECT_FILES_URL_PLACEHOLDER);
	});
});
