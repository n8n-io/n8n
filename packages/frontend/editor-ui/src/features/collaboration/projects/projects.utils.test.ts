import { SELF_HEALING_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';
import { usePostHog } from '@/app/stores/posthog.store';
import {
	compareSharingEntries,
	isSelfHealingEnabled,
	splitName,
	useRemoteProjectSearch,
	DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
} from './projects.utils';
import { useProjectsStore } from './projects.store';

describe('compareSharingEntries', () => {
	it('puts people before projects, and orders each by name', () => {
		const entries = [
			{ type: 'team', name: 'Sales' },
			{ type: 'personal', name: 'Zoe Adams <zoe@acme.io>' },
			{ type: 'team', name: 'Marketing' },
			{ type: 'personal', name: 'Anna Berg <anna@acme.io>' },
		];

		expect([...entries].sort(compareSharingEntries).map(({ name }) => name)).toEqual([
			'Anna Berg <anna@acme.io>',
			'Zoe Adams <zoe@acme.io>',
			'Marketing',
			'Sales',
		]);
	});
});

describe('splitName', () => {
	test.each([
		[
			'First Last <email@domain.com>',
			{
				name: 'First Last',
				email: 'email@domain.com',
			},
		],
		[
			'First Last Third <email@domain.com>',
			{
				name: 'First Last Third',
				email: 'email@domain.com',
			},
		],
		[
			'First Last Third Fourth <email@domain.com>',
			{
				name: 'First Last Third Fourth',
				email: 'email@domain.com',
			},
		],
		[
			' First Last Third Fourth <email@domain.com>',
			{
				name: 'First Last Third Fourth',
				email: 'email@domain.com',
			},
		],
		[
			'<email@domain.com>',
			{
				name: undefined,
				email: 'email@domain.com',
			},
		],
		[
			' <email@domain.com>',
			{
				name: undefined,
				email: 'email@domain.com',
			},
		],
		[
			'My project',
			{
				name: 'My project',
				email: undefined,
			},
		],
		[
			' My project ',
			{
				name: 'My project',
				email: undefined,
			},
		],
		[
			'MyProject',
			{
				name: 'MyProject',
				email: undefined,
			},
		],
		[
			undefined,
			{
				name: undefined,
				email: undefined,
			},
		],
	])('should split a name in the format "First Last <email@domain.com>"', (input, result) => {
		expect(splitName(input)).toEqual(result);
	});
});

describe('useRemoteProjectSearch', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('routes to the sharing-candidates endpoint via store.searchShareableProjects', async () => {
		const store = useProjectsStore();
		const spy = vi
			.spyOn(store, 'searchShareableProjects')
			.mockResolvedValue({ count: 0, data: [] });

		const search = useRemoteProjectSearch();
		await search('alice');

		expect(spy).toHaveBeenCalledWith({
			search: 'alice',
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
		});
	});

	it('scopes the page to a project type when the caller asks for one', async () => {
		const store = useProjectsStore();
		const spy = vi
			.spyOn(store, 'searchShareableProjects')
			.mockResolvedValue({ count: 0, data: [] });

		const search = useRemoteProjectSearch({ type: 'personal' });
		await search('alice');

		expect(spy).toHaveBeenCalledWith({
			search: 'alice',
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
			type: 'personal',
		});
	});

	it('asks for service accounts only when the caller opts in', async () => {
		const store = useProjectsStore();
		const spy = vi
			.spyOn(store, 'searchShareableProjects')
			.mockResolvedValue({ count: 0, data: [] });

		const search = useRemoteProjectSearch({ includeServiceAccounts: true });
		await search('bot');

		expect(spy).toHaveBeenCalledWith({
			search: 'bot',
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
			includeServiceAccounts: true,
		});
	});
});

describe('isSelfHealingEnabled', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it.each([
		{ setting: false, cloudManaged: false, flag: true, plan: 'Community', expected: false },
		{ setting: false, cloudManaged: false, flag: true, plan: 'Enterprise', expected: false },
		{ setting: false, cloudManaged: true, flag: true, plan: 'Community', expected: false },
		{ setting: false, cloudManaged: true, flag: true, plan: 'Enterprise', expected: false },
		{ setting: true, cloudManaged: false, flag: false, plan: 'Community', expected: true },
		{ setting: true, cloudManaged: false, flag: true, plan: 'Enterprise', expected: false },
		{ setting: true, cloudManaged: false, flag: false, plan: 'Enterprise', expected: false },
		{ setting: true, cloudManaged: true, flag: false, plan: 'Community', expected: false },
		{ setting: true, cloudManaged: true, flag: undefined, plan: 'Community', expected: false },
		{ setting: true, cloudManaged: true, flag: true, plan: 'Community', expected: true },
		{ setting: true, cloudManaged: true, flag: false, plan: 'Enterprise', expected: false },
		{ setting: true, cloudManaged: true, flag: undefined, plan: 'Enterprise', expected: false },
		{ setting: true, cloudManaged: true, flag: true, plan: 'Enterprise', expected: true },
	])(
		'returns $expected for setting $setting, Cloud $cloudManaged, flag $flag, plan $plan',
		({ setting, cloudManaged, flag, plan, expected }) => {
			const settingsStore = useSettingsStore();
			settingsStore.moduleSettings = {
				'instance-ai': { workflowSuggestionsEnabled: setting, cloudManaged },
			} as typeof settingsStore.moduleSettings;
			settingsStore.settings.license = { planName: plan } as typeof settingsStore.settings.license;
			// An undefined flag means that PostHog gave no answer.
			if (flag !== undefined) usePostHog().overrides[SELF_HEALING_FLAG] = { value: flag };

			expect(isSelfHealingEnabled()).toBe(expected);
		},
	);
});
