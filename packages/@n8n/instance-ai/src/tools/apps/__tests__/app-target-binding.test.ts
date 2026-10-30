import {
	INSTANCE_AI_APP_TARGETS_METADATA_KEY,
	INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY,
} from '@n8n/api-types';

import { parseAppTargets, parsePendingAppTarget, withAppTarget } from '../app-target-binding';

const APP_A = { appId: '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f70', projectId: 'project-1' };
const APP_B = { appId: '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71', projectId: 'project-1' };

describe('withAppTarget', () => {
	it('adds targets without duplicates and keeps other metadata', () => {
		const once = withAppTarget({ other: true }, APP_A);
		const twice = withAppTarget(withAppTarget(once, APP_B), APP_A);

		expect(twice).toEqual({ other: true, [INSTANCE_AI_APP_TARGETS_METADATA_KEY]: [APP_A, APP_B] });
	});

	it('drops the pending target only when the added app has the pending id', () => {
		const metadata = { [INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: APP_A };

		expect(parsePendingAppTarget(withAppTarget(metadata, APP_B))).toEqual(APP_A);
		expect(parsePendingAppTarget(withAppTarget(metadata, APP_A))).toBeUndefined();
	});
});

describe('parseAppTargets', () => {
	it('returns no targets for malformed metadata', () => {
		expect(parseAppTargets({ [INSTANCE_AI_APP_TARGETS_METADATA_KEY]: [{ appId: 'x' }] })).toEqual(
			[],
		);
		expect(parseAppTargets({})).toEqual([]);
	});
});
