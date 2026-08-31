import {
	clampSettingsSidebarWidth,
	DEFAULT_SETTINGS_SIDEBAR_WIDTH,
	filterSettingsEntries,
	flattenSettingsEntries,
	MAX_SETTINGS_SIDEBAR_WIDTH,
	MIN_SETTINGS_SIDEBAR_WIDTH,
	type SettingsSidebarGroup,
} from './settingsSidebar.utils';

const groups: SettingsSidebarGroup[] = [
	{
		type: 'group',
		id: 'account',
		label: 'Account',
		items: [{ type: 'item', id: 'settings-personal', label: 'Personal' }],
	},
	{
		type: 'group',
		id: 'users',
		label: 'Users and access',
		items: [
			{ type: 'item', id: 'settings-users', label: 'Users' },
			{ type: 'item', id: 'settings-sso', label: 'SSO' },
		],
	},
	{
		type: 'group',
		id: 'security',
		label: 'Security',
		items: [{ type: 'item', id: 'settings-security', label: 'Security & policies' }],
	},
	{
		type: 'group',
		id: 'ai',
		label: 'AI',
		items: [
			{ type: 'item', id: 'settings-ai', label: 'AI Assistant', available: false },
			{ type: 'item', id: 'settings-n8n-connect', label: 'Gateway credits' },
		],
	},
];

describe('settingsSidebar.utils', () => {
	describe('flattenSettingsEntries', () => {
		it('returns items from groups in definition order', () => {
			expect(flattenSettingsEntries(groups).map((entry) => entry.id)).toEqual([
				'settings-personal',
				'settings-users',
				'settings-sso',
				'settings-security',
				'settings-n8n-connect',
			]);
		});

		it('omits items marked unavailable', () => {
			expect(flattenSettingsEntries(groups).map((entry) => entry.id)).not.toContain('settings-ai');
		});
	});

	describe('filterSettingsEntries', () => {
		it('omits unavailable items when the query is empty', () => {
			const visible = filterSettingsEntries(groups, '');

			expect(visible.find((group) => group.id === 'ai')?.items.map((entry) => entry.id)).toEqual([
				'settings-n8n-connect',
			]);
		});

		it('filters items by label', () => {
			const filtered = filterSettingsEntries(groups, 'sso');

			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe('users');
			expect(filtered[0]?.items.map((entry) => entry.id)).toEqual(['settings-sso']);
		});

		it('keeps a whole group when the query matches the section name', () => {
			const filtered = filterSettingsEntries(groups, 'access');

			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.items.map((entry) => entry.id)).toEqual([
				'settings-users',
				'settings-sso',
			]);
		});

		it('does not surface unavailable items when the query matches the group', () => {
			const filtered = filterSettingsEntries(groups, 'ai');

			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.items.map((entry) => entry.id)).toEqual(['settings-n8n-connect']);
		});
	});

	describe('clampSettingsSidebarWidth', () => {
		it('clamps to the allowed range', () => {
			expect(clampSettingsSidebarWidth(Number.NaN)).toBe(DEFAULT_SETTINGS_SIDEBAR_WIDTH);
			expect(clampSettingsSidebarWidth(50)).toBe(MIN_SETTINGS_SIDEBAR_WIDTH);
			expect(clampSettingsSidebarWidth(800)).toBe(MAX_SETTINGS_SIDEBAR_WIDTH);
			expect(clampSettingsSidebarWidth(300)).toBe(300);
		});
	});
});
