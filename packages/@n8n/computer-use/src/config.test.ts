import * as path from 'node:path';

import { getSettingsDir, getSettingsFilePath, isProtectedSettingsPath } from './config';

describe('isProtectedSettingsPath', () => {
	const settingsDir = getSettingsDir();
	const settingsFile = getSettingsFilePath();

	it('matches the settings directory itself', () => {
		expect(isProtectedSettingsPath(settingsDir)).toBe(true);
	});

	it('matches a file inside the settings directory', () => {
		expect(isProtectedSettingsPath(settingsFile)).toBe(true);
	});

	it('matches a nested path inside the settings directory', () => {
		expect(isProtectedSettingsPath(path.join(settingsDir, 'sub', 'deep.json'))).toBe(true);
	});

	it('does not match an unrelated path', () => {
		expect(isProtectedSettingsPath('/tmp/safe/file.txt')).toBe(false);
	});

	it('does not match a path that shares a prefix but is a sibling', () => {
		// e.g. ~/.n8n-gateway-other should NOT match ~/.n8n-gateway
		expect(isProtectedSettingsPath(settingsDir + '-other')).toBe(false);
	});

	it('catches paths with redundant segments that resolve into the settings directory', () => {
		const withDotDot = path.join(settingsDir, 'sub', '..', 'settings.json');
		expect(isProtectedSettingsPath(withDotDot)).toBe(true);
	});

	it('catches paths with trailing slash', () => {
		expect(isProtectedSettingsPath(settingsDir + '/')).toBe(true);
	});
});
