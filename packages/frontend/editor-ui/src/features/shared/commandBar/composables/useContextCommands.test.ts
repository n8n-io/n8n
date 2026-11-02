import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VIEWS } from '@/app/constants';
import { rankItems } from '../commandBar.utils';
import { useContextCommands } from './useContextCommands';

const routerPushMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'commandBar.context.skills': 'Skills',
				'commandBar.context.preferences': 'Preferences',
				'commandBar.context.keywords.context': 'context',
			})[key] ?? key,
	}),
}));

const skillsEnabled = ref(false);
const preferencesEnabled = ref(false);

vi.mock('@/features/settings/context/context.utils', () => ({
	isContextSkillsEnabled: () => skillsEnabled.value,
	isContextPreferencesEnabled: () => preferencesEnabled.value,
}));

describe('useContextCommands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		skillsEnabled.value = false;
		preferencesEnabled.value = false;
	});

	const ids = (commands: ReturnType<typeof useContextCommands>['commands']) =>
		commands.value.map(({ id }) => id);

	it('shows no entries when both flags are off', () => {
		const { commands } = useContextCommands();

		expect(commands.value).toEqual([]);
	});

	it('shows only the Skills entry when only the skills flag is on', () => {
		skillsEnabled.value = true;
		const { commands } = useContextCommands();

		expect(ids(commands)).toEqual(['context-skills']);
	});

	it('shows only the Preferences entry when only the preferences flag is on', () => {
		preferencesEnabled.value = true;
		const { commands } = useContextCommands();

		expect(ids(commands)).toEqual(['context-preferences']);
	});

	it('shows both entries when both flags are on', () => {
		skillsEnabled.value = true;
		preferencesEnabled.value = true;
		const { commands } = useContextCommands();

		expect(ids(commands)).toEqual(['context-skills', 'context-preferences']);
	});

	it('updates the entries when a flag changes', () => {
		const { commands } = useContextCommands();
		expect(commands.value).toEqual([]);

		preferencesEnabled.value = true;
		expect(ids(commands)).toEqual(['context-preferences']);

		preferencesEnabled.value = false;
		expect(commands.value).toEqual([]);
	});

	it('finds the Skills entry with a "skills" search and opens the Skills page', () => {
		skillsEnabled.value = true;
		preferencesEnabled.value = true;
		const { commands } = useContextCommands();

		const [match] = rankItems(commands.value, 'skills');
		expect(match?.id).toBe('context-skills');
		expect(match?.title).toBe('Skills');

		void match?.handler?.();
		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.SETTINGS_CONTEXT_SKILLS });
	});

	it('finds the Preferences entry with a "preferences" search and opens the Preferences page', () => {
		skillsEnabled.value = true;
		preferencesEnabled.value = true;
		const { commands } = useContextCommands();

		const [match] = rankItems(commands.value, 'preferences');
		expect(match?.id).toBe('context-preferences');
		expect(match?.title).toBe('Preferences');

		void match?.handler?.();
		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES });
	});

	it('finds both entries with a "context" search', () => {
		skillsEnabled.value = true;
		preferencesEnabled.value = true;
		const { commands } = useContextCommands();

		const matchIds = rankItems(commands.value, 'context').map(({ id }) => id);
		expect(matchIds).toHaveLength(2);
		expect(matchIds).toEqual(expect.arrayContaining(['context-skills', 'context-preferences']));
	});
});
