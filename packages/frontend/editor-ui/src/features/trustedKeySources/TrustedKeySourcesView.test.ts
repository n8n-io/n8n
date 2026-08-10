import type { TrustedKeySource } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import TrustedKeySourcesView from './TrustedKeySourcesView.vue';

const getTrustedKeySources = vi.fn();
const updateTrustedKeySourcePolicy = vi.fn();

vi.mock('@n8n/rest-api-client', async () => {
	const actual =
		await vi.importActual<typeof import('@n8n/rest-api-client')>('@n8n/rest-api-client');
	return {
		...actual,
		getTrustedKeySources: (...args: unknown[]) => getTrustedKeySources(...args),
		updateTrustedKeySourcePolicy: (...args: unknown[]) => updateTrustedKeySourcePolicy(...args),
	};
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

const hasScope = vi.fn().mockReturnValue(true);
vi.mock('@n8n/stores/rbac.store', () => ({
	useRBACStore: () => ({ hasScope: (...args: unknown[]) => hasScope(...args) }),
}));

// The policy form is covered by its own test; here we only care that the view
// wires it up and persists what it emits.
vi.mock('./components/TrustedKeySourcePolicyModal.vue', () => ({
	default: {
		name: 'TrustedKeySourcePolicyModal',
		props: ['open', 'source'],
		emits: ['save', 'update:open'],
		template:
			'<button v-if="open" data-test-id="stub-save" @click="$emit(\'save\', source.id, { subjectClaim: \'uid\' })">save</button>',
	},
}));

function source(overrides: Partial<TrustedKeySource> = {}): TrustedKeySource {
	return {
		id: 'sso-source',
		type: 'jwks',
		issuer: 'https://idp.example.com',
		status: 'healthy',
		lastError: null,
		lastRefreshedAt: null,
		managedBy: 'sso-derived',
		policy: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		config: { url: 'https://idp.example.com/jwks.json', issuer: 'https://idp.example.com' },
		...overrides,
	} as TrustedKeySource;
}

const renderView = createComponentRenderer(TrustedKeySourcesView, {
	pinia: createTestingPinia(),
	global: { stubs: { TimeAgo: true } },
});

describe('TrustedKeySourcesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		hasScope.mockReturnValue(true);
		getTrustedKeySources.mockResolvedValue([source()]);
	});

	it('hides the edit action without the update scope', async () => {
		hasScope.mockReturnValue(false);
		const { queryByTestId, getByText } = renderView();

		await waitFor(() => expect(getByText('https://idp.example.com')).toBeInTheDocument());
		expect(queryByTestId('trusted-key-source-edit-policy')).not.toBeInTheDocument();
		expect(hasScope).toHaveBeenCalledWith('trustedKeySource:update');
	});

	it('saves an edited policy and replaces the row with the server copy', async () => {
		const updated = source({ policy: { subjectClaim: 'uid' } });
		updateTrustedKeySourcePolicy.mockResolvedValue(updated);
		const { getByTestId } = renderView();

		await waitFor(() => expect(getByTestId('trusted-key-source-edit-policy')).toBeInTheDocument());
		await userEvent.click(getByTestId('trusted-key-source-edit-policy'));
		await userEvent.click(getByTestId('stub-save'));

		expect(updateTrustedKeySourcePolicy).toHaveBeenCalledWith({}, 'sso-source', {
			subjectClaim: 'uid',
		});
		// The server refreshes the source as part of the update, so its copy
		// carries the resulting status — re-fetching the whole list would race it.
		await waitFor(() => expect(getTrustedKeySources).toHaveBeenCalledTimes(1));
	});

	it('keeps the form open when the save fails', async () => {
		updateTrustedKeySourcePolicy.mockRejectedValue(new Error('nope'));
		const { getByTestId } = renderView();

		await waitFor(() => expect(getByTestId('trusted-key-source-edit-policy')).toBeInTheDocument());
		await userEvent.click(getByTestId('trusted-key-source-edit-policy'));
		await userEvent.click(getByTestId('stub-save'));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		// Still mounted, so the admin doesn't lose what they typed.
		expect(getByTestId('stub-save')).toBeInTheDocument();
	});
});
