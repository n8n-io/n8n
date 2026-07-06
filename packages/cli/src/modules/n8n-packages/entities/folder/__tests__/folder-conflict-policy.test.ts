import { decideMatchedFolderAction } from '../folder-conflict-policy';

describe('decideMatchedFolderAction', () => {
	it('updates an already-imported folder under new-version, never blocking', () => {
		expect(decideMatchedFolderAction('new-version')).toEqual({ action: 'update', blocked: false });
	});

	it('blocks under fail', () => {
		expect(decideMatchedFolderAction('fail')).toEqual({ action: 'skip', blocked: true });
	});

	it('leaves the folder unchanged under skip, never blocking', () => {
		expect(decideMatchedFolderAction('skip')).toEqual({ action: 'skip', blocked: false });
	});
});
