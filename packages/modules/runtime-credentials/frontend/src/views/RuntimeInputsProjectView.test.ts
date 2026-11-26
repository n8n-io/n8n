import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import type { RequestFedPolicy, RuntimeCredentialRule } from '../runtime-credentials.api';
import RuntimeInputsProjectView from './RuntimeInputsProjectView.vue';

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError: vi.fn() }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useRoute: () => ({ params: { projectId: 'p1' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchRules = vi.fn<ApiMock>();
const fetchInstancePolicy = vi.fn<ApiMock>();
const fetchProjectPolicy = vi.fn<ApiMock>();
const saveProjectPolicy = vi.fn<ApiMock>();

vi.mock('../runtime-credentials.api', () => ({
	fetchRules: async (...args: unknown[]) => await fetchRules(...args),
	fetchInstancePolicy: async (...args: unknown[]) => await fetchInstancePolicy(...args),
	fetchProjectPolicy: async (...args: unknown[]) => await fetchProjectPolicy(...args),
	saveProjectPolicy: async (...args: unknown[]) => await saveProjectPolicy(...args),
	createRule: vi.fn(),
	updateRule: vi.fn(),
	deleteRule: vi.fn(),
}));

const rule: RuntimeCredentialRule = {
	alias: 'gmail-caller',
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.authorization',
	credentialType: 'gmailOAuth2Api',
	source: 'database',
	stubCredentialId: 's1',
};
const instancePolicy: RequestFedPolicy = {
	rules: [{ id: 'i1', action: 'deny', selector: { kind: 'name', value: 'sshPrivateKey' } }],
	defaultAction: 'allow',
	version: 1,
};
const projectPolicy: RequestFedPolicy = { rules: [], defaultAction: 'allow', version: 4 };

const renderView = createComponentRenderer(RuntimeInputsProjectView);

describe('RuntimeInputsProjectView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchRules.mockResolvedValue([rule]);
		fetchInstancePolicy.mockResolvedValue(instancePolicy);
		fetchProjectPolicy.mockResolvedValue(projectPolicy);
	});

	it('shows instance rules read-only and the policy', async () => {
		renderView();

		expect(await screen.findByTestId('runtime-rule-gmail-caller')).toBeInTheDocument();
		expect(screen.queryByTestId('runtime-rule-edit')).not.toBeInTheDocument();
		expect(screen.queryByTestId('runtime-rule-delete')).not.toBeInTheDocument();
		expect(await screen.findByText('Instance default: allow')).toBeInTheDocument();
		expect(screen.getByText('Instance: deny sshPrivateKey')).toBeInTheDocument();
		expect(screen.getByTestId('runtime-policy-empty')).toBeInTheDocument();
		expect(fetchProjectPolicy).toHaveBeenCalledWith(expect.anything(), 'p1');
	});

	it('adds a deny rule with the current version', async () => {
		saveProjectPolicy.mockImplementation(
			async (_context, _id, policy) => await Promise.resolve(policy),
		);
		renderView();

		await userEvent.type(await screen.findByTestId('runtime-policy-input'), 'slackApi');
		await userEvent.click(screen.getByTestId('runtime-policy-deny'));

		await waitFor(() => expect(saveProjectPolicy).toHaveBeenCalled());
		const [, projectId, saved] = saveProjectPolicy.mock.calls[0] as [
			unknown,
			string,
			RequestFedPolicy,
		];
		expect(projectId).toBe('p1');
		expect(saved.version).toBe(4);
		expect(saved.rules).toEqual([
			expect.objectContaining({ action: 'deny', selector: { kind: 'name', value: 'slackApi' } }),
		]);
		expect(await screen.findByText('Project: deny slackApi')).toBeInTheDocument();
	});

	it('shows an actionable error on a version conflict', async () => {
		saveProjectPolicy.mockRejectedValue(
			Object.assign(new Error('conflict'), { httpStatusCode: 409 }),
		);
		renderView();

		await userEvent.type(await screen.findByTestId('runtime-policy-input'), 'slackApi');
		await userEvent.click(screen.getByTestId('runtime-policy-deny'));

		expect(await screen.findByTestId('runtime-policy-save-error')).toHaveTextContent(
			'Reload the page and try again.',
		);
	});

	it('shows an error when the policy does not load', async () => {
		fetchProjectPolicy.mockRejectedValue(new Error('boom'));
		renderView();

		expect(await screen.findByTestId('runtime-policy-error')).toBeInTheDocument();
	});
});
