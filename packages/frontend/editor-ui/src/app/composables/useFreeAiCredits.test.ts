import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const credentialsStore = vi.hoisted(() => ({
	allCredentials: [] as Array<{ type: string }>,
	claimFreeAiCredits: vi.fn(),
}));

const settingsStore = vi.hoisted(() => ({
	isAiCreditsEnabled: true,
	aiCreditsQuota: 100,
	isAiGatewayEnabled: false,
}));

const usersStore = vi.hoisted(() => ({
	currentUser: {
		settings: {
			userClaimedAiCredits: false,
		},
	},
}));

const projectsStore = vi.hoisted(() => ({
	currentProject: { id: 'current-project' },
}));

const telemetry = vi.hoisted(() => ({
	track: vi.fn(),
}));

const toast = vi.hoisted(() => ({
	showError: vi.fn(),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => settingsStore,
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => usersStore,
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStore,
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => telemetry,
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => toast,
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useFreeAiCredits', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialsStore.allCredentials = [];
		settingsStore.isAiCreditsEnabled = true;
		settingsStore.isAiGatewayEnabled = false;
		usersStore.currentUser.settings.userClaimedAiCredits = false;
		projectsStore.currentProject = { id: 'current-project' };
	});

	it('returns the claimed credential for an explicit project', async () => {
		const { useFreeAiCredits } = await import('./useFreeAiCredits');
		const claimedCredential = {
			id: 'free-openai-credential',
			name: 'n8n free OpenAI API credits',
			type: 'openAiApi',
		};
		credentialsStore.claimFreeAiCredits.mockResolvedValueOnce(claimedCredential);

		const result = await useFreeAiCredits().claimCreditsAndGetCredential(
			'agentBuilderModelSelector',
			'project-2',
		);

		expect(result).toBe(claimedCredential);
		expect(credentialsStore.claimFreeAiCredits).toHaveBeenCalledWith('project-2');
		expect(usersStore.currentUser.settings.userClaimedAiCredits).toBe(true);
		expect(telemetry.track).toHaveBeenCalledWith('User claimed OpenAI credits', {
			source: 'agentBuilderModelSelector',
		});
	});

	it('can use a project-scoped OpenAI credential check for eligibility', async () => {
		credentialsStore.allCredentials = [{ type: 'openAiApi' }];
		const { useFreeAiCredits } = await import('./useFreeAiCredits');

		const { userCanClaimOpenAiCredits } = useFreeAiCredits({
			hasOpenAiCredential: ref(false),
		});

		expect(userCanClaimOpenAiCredits.value).toBe(true);
	});

	it('blocks eligibility when the project-scoped check finds an OpenAI credential', async () => {
		const { useFreeAiCredits } = await import('./useFreeAiCredits');

		const { userCanClaimOpenAiCredits } = useFreeAiCredits({
			hasOpenAiCredential: ref(true),
		});

		expect(userCanClaimOpenAiCredits.value).toBe(false);
	});
});
