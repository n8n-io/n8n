import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';

import type { RequestFedPolicy, RuntimeCredentialRule } from '../runtime-credentials.api';
import RuntimeInputsProjectView from './RuntimeInputsProjectView.vue';

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError: vi.fn() }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' }, baseUrl: '' }),
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
}));

vi.mock('../components/project/credentialTypes', async (importOriginal) => ({
	...(await importOriginal<object>()),
	fetchCredentialTypeInfo: async () =>
		await Promise.resolve(
			new Map([
				['gmailOAuth2', { displayName: 'Gmail OAuth2 API', extends: ['googleOAuth2Api'] }],
				['slackApi', { displayName: 'Slack API', extends: [] }],
				['sshPrivateKey', { displayName: 'SSH Private Key', extends: [] }],
			]),
		),
}));

const rule = (alias: string, credentialType: string, nodeType = 'n8n-nodes-base.webhook') =>
	({
		alias,
		nodeType,
		path: `body.${alias}`,
		credentialType,
		source: 'database',
		stubCredentialId: `s-${alias}`,
	}) satisfies RuntimeCredentialRule;

const rules = [
	rule('gmail-caller', 'gmailOAuth2'),
	rule('slack-bot', 'slackApi'),
	rule('ssh-deploy', 'sshPrivateKey', '*'),
];
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
		fetchRules.mockResolvedValue(rules);
		fetchInstancePolicy.mockResolvedValue(instancePolicy);
		fetchProjectPolicy.mockResolvedValue(projectPolicy);
		saveProjectPolicy.mockImplementation(
			async (_context, _id, policy) =>
				await Promise.resolve({ ...(policy as RequestFedPolicy), version: 5 }),
		);
	});

	it('lists only the credential types that instance rules feed, with their rules', async () => {
		renderView();

		expect(await screen.findByTestId('runtime-project-type-slackApi')).toHaveTextContent(
			'Slack API',
		);
		expect(screen.getByTestId('runtime-project-type-gmailOAuth2')).toHaveTextContent(
			'Gmail OAuth2 API',
		);
		expect(screen.getAllByTestId(/^runtime-project-type-/)).toHaveLength(3);
		expect(screen.getByText('slack-bot')).toBeInTheDocument();
		expect(screen.getByText('body.slack-bot on n8n-nodes-base.webhook')).toBeInTheDocument();
		expect(screen.getByText('body.ssh-deploy on any trigger node')).toBeInTheDocument();
		expect(fetchProjectPolicy).toHaveBeenCalledWith(expect.anything(), 'p1');
	});

	it('shows an instance block as read-only', async () => {
		renderView();

		const access = await screen.findByTestId('runtime-project-access-sshPrivateKey');
		expect(access).toHaveTextContent('Blocked by instance');
		expect(within(access).queryByRole('button')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Access for Slack API' })).toBeInTheDocument();
	});

	it('keeps a project allow rule from loosening an instance block', async () => {
		fetchProjectPolicy.mockResolvedValue({
			...projectPolicy,
			rules: [{ id: 'p1', action: 'allow', selector: { kind: 'name', value: 'sshPrivateKey' } }],
		});
		renderView();

		expect(await screen.findByTestId('runtime-project-access-sshPrivateKey')).toHaveTextContent(
			'Blocked by instance',
		);
	});

	it('blocks a credential type with the version that the page read', async () => {
		renderView();

		await userEvent.click(await screen.findByRole('button', { name: 'Access for Slack API' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Blocked' }));

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
		expect(await screen.findByText('Blocked')).toBeInTheDocument();
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', title: 'Slack API blocked' }),
		);
	});

	it('removes the project deny rule when the type is allowed again', async () => {
		fetchProjectPolicy.mockResolvedValue({
			...projectPolicy,
			rules: [{ id: 'p1', action: 'deny', selector: { kind: 'name', value: 'slackApi' } }],
		});
		renderView();

		await userEvent.click(await screen.findByRole('button', { name: 'Access for Slack API' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Allowed' }));

		await waitFor(() => expect(saveProjectPolicy).toHaveBeenCalled());
		const [, , saved] = saveProjectPolicy.mock.calls[0] as [unknown, string, RequestFedPolicy];
		expect(saved.rules).toEqual([]);
		expect(saved.version).toBe(4);
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Slack API allowed' }),
		);
	});

	it('asks for a refresh on a version conflict and reloads on refresh', async () => {
		saveProjectPolicy.mockRejectedValue(
			Object.assign(new Error('conflict'), { httpStatusCode: 409 }),
		);
		renderView();

		await userEvent.click(await screen.findByRole('button', { name: 'Access for Slack API' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Blocked' }));

		expect(await screen.findByTestId('runtime-project-save-error')).toHaveTextContent(
			'Someone else changed this policy. Refresh to see the latest version, then try again.',
		);
		expect(showMessage).not.toHaveBeenCalled();

		await userEvent.click(screen.getByTestId('runtime-project-refresh'));
		await waitFor(() => expect(fetchProjectPolicy).toHaveBeenCalledTimes(2));
	});

	it('shows a generic error when the save fails', async () => {
		saveProjectPolicy.mockRejectedValue(new Error('boom'));
		renderView();

		await userEvent.click(await screen.findByRole('button', { name: 'Access for Slack API' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Blocked' }));

		expect(await screen.findByTestId('runtime-project-save-error')).toHaveTextContent(
			"Couldn't save the change. Try again.",
		);
		expect(screen.queryByTestId('runtime-project-refresh')).not.toBeInTheDocument();
	});

	it('shows a callout when the instance has no rules', async () => {
		fetchRules.mockResolvedValue([]);
		renderView();

		expect(await screen.findByTestId('runtime-project-no-rules')).toHaveTextContent(
			"Your instance admin hasn't set up any run-time inputs yet.",
		);
		expect(screen.queryByTestId('runtime-project-table')).not.toBeInTheDocument();
	});

	it('shows a loading state before the data arrives', () => {
		fetchRules.mockReturnValue(new Promise(() => {}));
		renderView();

		expect(screen.getByTestId('runtime-project-loading')).toBeInTheDocument();
	});

	it('shows an error with a retry when the project policy does not load', async () => {
		fetchProjectPolicy.mockRejectedValueOnce(new Error('boom'));
		renderView();

		expect(await screen.findByTestId('runtime-project-error')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('runtime-project-retry'));
		expect(await screen.findByTestId('runtime-project-type-slackApi')).toBeInTheDocument();
	});

	it('explains a missing permission without a retry', async () => {
		fetchRules.mockRejectedValue(Object.assign(new Error('forbidden'), { httpStatusCode: 403 }));
		renderView();

		expect(await screen.findByTestId('runtime-project-error')).toHaveTextContent(
			"You can't view the instance rules.",
		);
		expect(screen.queryByTestId('runtime-project-retry')).not.toBeInTheDocument();
	});

	it('works from the project policy when the instance policy is not readable', async () => {
		fetchInstancePolicy.mockRejectedValue(
			Object.assign(new Error('forbidden'), { httpStatusCode: 403 }),
		);
		renderView();

		expect(await screen.findByTestId('runtime-project-instance-unavailable')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Access for SSH Private Key' })).toBeInTheDocument();
	});

	it('shows search only for more than eight rows and filters by name', async () => {
		fetchRules.mockResolvedValue(
			Array.from({ length: 9 }, (_, index) => rule(`rule-${index}`, `type${index}`)),
		);
		renderView();

		const search = await screen.findByTestId('runtime-project-search');
		await userEvent.type(search, 'type3');

		expect(screen.getAllByTestId(/^runtime-project-type-/)).toHaveLength(1);

		await userEvent.clear(search);
		await userEvent.type(search, 'zzz');
		expect(await screen.findByTestId('runtime-project-no-match')).toBeInTheDocument();
	});

	it('hides search for eight rows or fewer', async () => {
		renderView();

		await screen.findByTestId('runtime-project-type-slackApi');
		expect(screen.queryByTestId('runtime-project-search')).not.toBeInTheDocument();
	});
});
