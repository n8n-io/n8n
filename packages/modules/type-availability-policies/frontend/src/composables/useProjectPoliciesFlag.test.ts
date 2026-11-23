import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useProjectPoliciesFlag } from './useProjectPoliciesFlag';

describe('useProjectPoliciesFlag', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('is off when the server sends no flag', () => {
		expect(useProjectPoliciesFlag().isEnabled.value).toBe(false);
	});

	it.each([
		['true', true],
		['1', true],
		['false', false],
		['', false],
	])('reads %j as %s', (value, expected) => {
		useSettingsStore().settings.envFeatureFlags = {
			N8N_ENV_FEAT_NODE_AND_CREDENTIAL_PROJECT_POLICIES: value,
		};

		expect(useProjectPoliciesFlag().isEnabled.value).toBe(expected);
	});
});
