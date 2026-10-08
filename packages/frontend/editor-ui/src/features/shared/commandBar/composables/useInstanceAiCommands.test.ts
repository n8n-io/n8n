import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { ExperienceMode, FrontendModuleSettings } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import { resetExperienceModeState } from '@/features/ai/instanceAi/experience/useExperienceMode';
import { useInstanceAiCommands } from './useInstanceAiCommands';

const { showMessage, hasPermission } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	hasPermission: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError: vi.fn() }),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission }));

const COMMAND_ID = 'experience-mode-switch';

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

function setExperience(enabled: boolean) {
	useSettingsStore().moduleSettings = {
		'instance-ai': {
			enabled: true,
			experience: { enabled, defaultMode: 'simple' },
		} as InstanceAiModuleSettings,
	};
}

function signIn(experienceMode?: ExperienceMode) {
	const usersStore = mockedStore(useUsersStore);
	usersStore.currentUserId = 'user-1';
	usersStore.usersById = {
		'user-1': { id: 'user-1', settings: experienceMode ? { experienceMode } : {} } as IUser,
	};
	return usersStore;
}

function findModeCommand() {
	const { commands } = useInstanceAiCommands({ lastQuery: ref('') });
	return commands.value.find((command) => command.id === COMMAND_ID);
}

describe('useInstanceAiCommands: interface mode', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		resetExperienceModeState();
		vi.clearAllMocks();
		mockedStore(useSettingsStore).isModuleActive.mockReturnValue(true);
		hasPermission.mockReturnValue(true);
	});

	it('has no mode command while experience modes are off', () => {
		signIn('simple');
		setExperience(false);

		expect(findModeCommand()).toBeUndefined();
	});

	it('offers Power while Simple is on', () => {
		signIn();
		setExperience(true);

		expect(findModeCommand()?.title).toBe('Switch to Power mode');
	});

	it('offers Simple while Power is on', () => {
		signIn('power');
		setExperience(true);

		expect(findModeCommand()?.title).toBe('Switch to Simple mode');
	});

	it('is offered to a member who cannot message the Assistant', () => {
		signIn();
		setExperience(true);
		hasPermission.mockReturnValue(false);
		const { commands } = useInstanceAiCommands({ lastQuery: ref('') });

		expect(commands.value.map((command) => command.id)).toEqual([COMMAND_ID]);
	});

	it('keeps the Assistant commands next to the mode command', () => {
		signIn();
		setExperience(true);
		const { commands } = useInstanceAiCommands({ lastQuery: ref('') });

		expect(commands.value.map((command) => command.id)).toEqual([
			'instance-ai-open',
			'instance-ai-new-thread',
			'instance-ai-open-thread',
			COMMAND_ID,
		]);
	});

	it('saves the other mode and confirms the switch', async () => {
		const usersStore = signIn('simple');
		setExperience(true);
		usersStore.updateUserSettings.mockResolvedValue(undefined);

		await findModeCommand()?.handler?.();

		expect(usersStore.updateUserSettings).toHaveBeenCalledWith({ experienceMode: 'power' });
		expect(showMessage).toHaveBeenCalledWith({ type: 'success', title: 'Switched to Power mode' });
	});
});
