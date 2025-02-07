import { Container } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';

import { isFilePathBlocked } from '../file-system-helper-functions';

describe('isFilePathBlocked', () => {
	test('should return true for static cache dir', () => {
		const filePath = Container.get(InstanceSettings).staticCacheDir;

		expect(isFilePathBlocked(filePath)).toBe(true);
	});
});
