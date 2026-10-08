import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { ExperienceMode, FrontendModuleSettings } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { resetExperienceModeState, useExperienceMode } from '../useExperienceMode';

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

function setExperience(experience: InstanceAiModuleSettings['experience']) {
	useSettingsStore().moduleSettings = {
		'instance-ai': { enabled: true, experience } as InstanceAiModuleSettings,
	};
}

function signIn(id: string, experienceMode?: ExperienceMode) {
	const usersStore = useUsersStore();
	usersStore.usersById[id] = {
		id,
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: `${id}@example.com`,
		isDefaultUser: false,
		isPending: false,
		isPendingUser: false,
		mfaEnabled: false,
		settings: experienceMode ? { experienceMode } : {},
	} as IUser;
	usersStore.currentUserId = id;
}

/**
 * Stands in for PATCH /me/settings. Like the real store action, each answer
 * replaces the stored settings with the server copy.
 */
function fakeSettingsServer() {
	const usersStore = useUsersStore();
	const replies: Array<{ settle: (error?: Error) => void }> = [];
	const update = vi
		.spyOn(usersStore, 'updateUserSettings')
		.mockImplementation(async ({ experienceMode }) => {
			await new Promise<void>((resolve, reject) =>
				replies.push({ settle: (error) => (error ? reject(error) : resolve()) }),
			);
			const user = usersStore.currentUser;
			if (user) user.settings = { ...user.settings, experienceMode };
		});

	async function answer(error?: Error) {
		const reply = replies.shift();
		if (!reply) throw new Error('No save is waiting for an answer');
		reply.settle(error);
		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	return {
		update,
		answer,
		waiting: () => replies.length,
		sent: () => update.mock.calls.map(([dto]) => dto.experienceMode),
	};
}

describe('useExperienceMode', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		resetExperienceModeState();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('with the flag off', () => {
		it('is disabled and always Power, even with a saved Simple mode', () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: false, defaultMode: 'simple' });

			const { isEnabled, mode, isSimple } = useExperienceMode();

			expect(isEnabled.value).toBe(false);
			expect(mode.value).toBe('power');
			expect(isSimple.value).toBe(false);
		});

		it('treats missing module settings as off', () => {
			signIn('user-1', 'simple');

			expect(useExperienceMode().isEnabled.value).toBe(false);
			expect(useExperienceMode().mode.value).toBe('power');
		});

		it('does not save a mode', async () => {
			signIn('user-1');
			setExperience({ enabled: false, defaultMode: 'power' });
			const server = fakeSettingsServer();

			await expect(useExperienceMode().setMode('simple')).resolves.toBe(false);
			expect(server.update).not.toHaveBeenCalled();
		});
	});

	describe('with the flag on', () => {
		it('uses the instance default when the user has not chosen', () => {
			signIn('user-1');
			setExperience({ enabled: true, defaultMode: 'simple' });

			const { isEnabled, mode, isSimple } = useExperienceMode();

			expect(isEnabled.value).toBe(true);
			expect(mode.value).toBe('simple');
			expect(isSimple.value).toBe(true);
		});

		it("uses the user's saved mode over the instance default", () => {
			signIn('user-1', 'power');
			setExperience({ enabled: true, defaultMode: 'simple' });

			expect(useExperienceMode().mode.value).toBe('power');
		});

		it('switches at once and then saves the mode', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();

			const result = setMode('power');

			expect(mode.value).toBe('power');
			expect(server.update).toHaveBeenCalledWith({ experienceMode: 'power' });

			await server.answer();

			await expect(result).resolves.toBe(true);
			expect(mode.value).toBe('power');
			expect(useUsersStore().currentUser?.settings?.experienceMode).toBe('power');
			expect(showMessage).not.toHaveBeenCalled();
			expect(showError).not.toHaveBeenCalled();
		});

		it('reverts to the saved mode and shows an error when the save fails', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'power' });
			const server = fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();
			const error = new Error('Request failed');

			const result = setMode('power', { announce: true });
			expect(mode.value).toBe('power');

			await server.answer(error);

			await expect(result).resolves.toBe(false);
			expect(mode.value).toBe('simple');
			expect(showError).toHaveBeenCalledTimes(1);
			expect(showError).toHaveBeenCalledWith(error, "Couldn't change the interface. Try again.");
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('reverts to the last mode the server confirmed when a queued save fails', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();

			void setMode('power');
			const second = setMode('simple');
			await server.answer();
			await server.answer(new Error('Request failed'));

			await expect(second).resolves.toBe(false);
			expect(mode.value).toBe('power');
			expect(showError).toHaveBeenCalledTimes(1);
		});

		it('keeps the latest choice on screen while an earlier save returns', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();

			void setMode('power');
			const latest = setMode('simple');
			await server.answer();

			// The first answer stored Power, but the user last chose Simple.
			expect(useUsersStore().currentUser?.settings?.experienceMode).toBe('power');
			expect(mode.value).toBe('simple');

			await server.answer();
			await expect(latest).resolves.toBe(true);
			expect(mode.value).toBe('simple');
			expect(server.sent()).toEqual(['power', 'simple']);
		});

		it('turns three fast toggles into at most two saves and ends on the last choice', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();

			const results = [setMode('power'), setMode('simple'), setMode('power')];
			while (server.waiting() > 0) await server.answer();

			expect(await Promise.all(results)).toEqual([false, false, true]);
			expect(server.sent().length).toBeLessThanOrEqual(2);
			expect(server.sent().at(-1)).toBe('power');
			expect(mode.value).toBe('power');
			expect(useUsersStore().currentUser?.settings?.experienceMode).toBe('power');
		});

		it('shows one success message for the last change when asked to announce', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const { setMode } = useExperienceMode();

			const results = [setMode('power', { announce: true }), setMode('simple', { announce: true })];
			await server.answer();
			await server.answer();
			await Promise.all(results);

			expect(showMessage).toHaveBeenCalledTimes(1);
			expect(showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'Switched to Simple mode',
			});
		});

		it('announces a switch to Power', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();

			const result = useExperienceMode().setMode('power', { announce: true });
			await server.answer();
			await result;

			expect(showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'Switched to Power mode',
			});
		});

		it('does not save the mode that already shows, so the user keeps the instance default', async () => {
			signIn('user-1');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();

			await expect(useExperienceMode().setMode('simple', { announce: true })).resolves.toBe(true);

			expect(server.update).not.toHaveBeenCalled();
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('shares one queue between the sidebar, Settings and the command bar', async () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			const server = fakeSettingsServer();
			const sidebar = useExperienceMode();
			const settings = useExperienceMode();

			void sidebar.setMode('power');
			expect(settings.mode.value).toBe('power');

			const fromSettings = settings.setMode('simple');
			expect(sidebar.mode.value).toBe('simple');
			expect(server.update).toHaveBeenCalledTimes(1);

			await server.answer();
			await server.answer();
			await expect(fromSettings).resolves.toBe(true);
			expect(server.sent()).toEqual(['power', 'simple']);
		});

		it('does not show the pending choice of another user after a new sign-in', () => {
			signIn('user-1', 'simple');
			setExperience({ enabled: true, defaultMode: 'simple' });
			fakeSettingsServer();
			const { mode, setMode } = useExperienceMode();

			void setMode('power');
			expect(mode.value).toBe('power');

			signIn('user-2', 'simple');
			expect(mode.value).toBe('simple');
		});
	});
});
