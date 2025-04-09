import { type BinaryDataConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { type InstanceSettings } from '@/instance-settings';

import { BinaryDataService } from '../binary-data.service';

describe('BinaryDataService', () => {
	it('should set signingSecret from InstanceSettings if not provided in BinaryDataConfig', () => {
		const signingSecret = 'test-signing-secret';
		const instanceSettings: InstanceSettings = mock<InstanceSettings>({ signingSecret });
		const binaryDataConfig: BinaryDataConfig = mock<BinaryDataConfig>({ signingSecret: undefined });

		new BinaryDataService(instanceSettings, binaryDataConfig);

		expect(binaryDataConfig.signingSecret).toBe(signingSecret);
	});

	it('should not overwrite signingSecret if already provided in BinaryDataConfig', () => {
		const signingSecret = 'test-signing-secret';
		const instanceSettings: InstanceSettings = mock<InstanceSettings>({ signingSecret });
		const binaryDataConfig: BinaryDataConfig = mock<BinaryDataConfig>({ signingSecret });

		new BinaryDataService(instanceSettings, binaryDataConfig);

		expect(binaryDataConfig.signingSecret).toBe(signingSecret);
	});
});
