/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, screen } from '@testing-library/vue';
import FreeAiCreditsCallout from '@/components/FreeAiCreditsCallout.vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useTelemetry } from '@/composables/useTelemetry';

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(),
}));

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(),
}));

vi.mock('@/stores/credentials.store', () => ({
	useCredentialsStore: vi.fn(),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(),
}));

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: vi.fn(),
}));

vi.mock('@/stores/projects.store', () => ({
	useProjectsStore: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(),
}));

const assertUserCannotClaimCredits = () => {
	expect(screen.queryByText('Get 100 free OpenAI API credits')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Claim credits' })).not.toBeInTheDocument();
};

const assertUserCanClaimCredits = () => {
	expect(screen.getByText('Get 100 free OpenAI API credits')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Claim credits' })).toBeInTheDocument();
};

const assertUserClaimedCredits = () => {
	expect(
		screen.getByText(
			'Claimed 100 free OpenAI API credits! Please note these free credits are only for the following models:',
		),
	).toBeInTheDocument();

	expect(
		screen.getByText(
			'gpt-4o-mini, text-embedding-3-small, dall-e-3, tts-1, whisper-1, and text-moderation-latest',
		),
	).toBeInTheDocument();
};

describe('FreeAiCreditsCallout', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(useSettingsStore as any).mockReturnValue({
			isAiCreditsEnabled: true,
			aiCreditsQuota: 100,
		});

		(useCredentialsStore as any).mockReturnValue({
			allCredentials: [],
			upsertCredential: vi.fn(),
			claimFreeAiCredits: vi.fn(),
		});

		(useUsersStore as any).mockReturnValue({
			currentUser: {
				settings: {
					userClaimedAiCredits: false,
				},
			},
		});

		(useNDVStore as any).mockReturnValue({
			activeNode: { type: '@n8n/n8n-nodes-langchain.openAi' },
		});

		(useProjectsStore as any).mockReturnValue({
			currentProject: { id: 'test-project-id' },
		});

		(useRootStore as any).mockReturnValue({
			restApiContext: {},
		});

		(useToast as any).mockReturnValue({
			showError: vi.fn(),
		});

		(useTelemetry as any).mockReturnValue({
			track: vi.fn(),
		});
	});

	it('should shows the claim callout when the user can claim credits', () => {
		renderComponent(FreeAiCreditsCallout);

		assertUserCanClaimCredits();
	});

	it('should show success callout when credit are claimed', async () => {
		const credentialsStore = mockedStore(useCredentialsStore);

		renderComponent(FreeAiCreditsCallout);

		const claimButton = screen.getByRole('button', {
			name: 'Claim credits',
		});

		await fireEvent.click(claimButton);

		expect(credentialsStore.claimFreeAiCredits).toHaveBeenCalledWith('test-project-id');
		expect(useTelemetry().track).toHaveBeenCalledWith('User claimed OpenAI credits');
		assertUserClaimedCredits();
	});

	it('should not be able to claim credits is user already claimed credits', async () => {
		(useUsersStore as any).mockReturnValue({
			currentUser: {
				settings: {
					userClaimedAiCredits: true,
				},
			},
		});

		renderComponent(FreeAiCreditsCallout);

		assertUserCannotClaimCredits();
	});

	it('should not be able to claim credits is user does not have ai credits enabled', async () => {
		(useSettingsStore as any).mockReturnValue({
			isAiCreditsEnabled: false,
			aiCreditsQuota: 0,
		});

		renderComponent(FreeAiCreditsCallout);

		assertUserCannotClaimCredits();
	});

	it('should not be able to claim credits if user already has OpenAiApi credential', async () => {
		(useCredentialsStore as any).mockReturnValue({
			allCredentials: [
				{
					type: 'openAiApi',
				},
			],
			upsertCredential: vi.fn(),
		});

		renderComponent(FreeAiCreditsCallout);

		assertUserCannotClaimCredits();
	});

	it('should not be able to claim credits if active node it is not a valid node', async () => {
		(useNDVStore as any).mockReturnValue({
			activeNode: { type: '@n8n/n8n-nodes.jira' },
		});

		renderComponent(FreeAiCreditsCallout);

		assertUserCannotClaimCredits();
	});
});
