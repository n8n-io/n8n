import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import type {
	AutomationProposalCard as Proposal,
	InstanceAiConfirmRequest,
	InstanceAiThreadSummary,
	InstanceAiToolCallState,
	LinkedInstanceTransferPreflight,
} from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { fetchTransferPreflight } from '@/features/linkedInstances/transfer/transfer.api';
import { resetExperienceModeState } from '../../../experience/useExperienceMode';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../../instanceAi.store';
import { createTestRouter } from '../../../navigation/__tests__/navigationFixtures';
import { provideThreadSharingContext } from '../../../sharing/threadSharingContext';
import type { ThreadSharingView } from '../../../sharing/sharingView';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { clearAutomationPreflights } from '../useAutomationPreflight';
import { CLOUD_LINK_ID, makeLinkedProposal, makeProposal } from './automationProposalFixtures';

vi.mock('@/features/linkedInstances/transfer/transfer.api', () => ({
	fetchTransferPreflight: vi.fn(),
	moveWorkflow: vi.fn(),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { props: ['nodeType', 'nodeName', 'size'], template: '<span />' },
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null, loadNodeTypesIfNotLoaded: async () => {} }),
}));

const THREAD_ID = 'thread-1';
const REMOTE_URL = 'https://cloud.example.test/workflow/remote-9';
const preflightMock = vi.mocked(fetchTransferPreflight);

function preflight(
	overrides: Partial<LinkedInstanceTransferPreflight> = {},
): LinkedInstanceTransferPreflight {
	return {
		workflowName: 'Digest builder',
		moves: { nodes: 2 },
		nodeTypeCheck: 'unknown',
		missingNodeTypes: [],
		credentials: [],
		targetProject: null,
		subWorkflowCalls: [],
		...overrides,
	};
}

const NEEDS_SLACK = preflight({
	credentials: [{ name: 'Slack account', type: 'slackApi', status: 'needs-set-up' }],
});

function useExperience(defaultMode: 'simple' | 'power') {
	const settingsStore = useSettingsStore();
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: true, experience: { enabled: true, defaultMode } },
	} as unknown as typeof settingsStore.moduleSettings;
}

function chatSummary(overrides: Partial<InstanceAiThreadSummary> = {}): InstanceAiThreadSummary {
	return {
		id: THREAD_ID,
		title: 'Weekly report',
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

/** A chat around the card: the thread, the sharing view, and the answer that the card sends. */
const InChat = defineComponent({
	props: {
		proposal: { type: Object as PropType<Proposal>, required: true },
		disabled: { type: Boolean, default: false },
		teammate: { type: Boolean, default: false },
		answer: { type: null, default: undefined },
		call: {
			type: Object as PropType<{ value: InstanceAiToolCallState | undefined }>,
			default: undefined,
		},
		/** Takes each answer. The card stays open, so a test can read its buttons after one. */
		record: {
			type: Function as PropType<(body: InstanceAiConfirmRequest) => void>,
			required: true,
		},
	},
	setup(props) {
		provideThread({
			id: THREAD_ID,
			findToolCall: (id: string, toolName?: string) =>
				id === 'tc-1' && toolName === props.call?.value?.toolName ? props.call?.value : undefined,
		} as unknown as ThreadRuntime);
		if (props.teammate) {
			const view = { role: 'teammate', isShared: true } as ThreadSharingView;
			provideThreadSharingContext({ view: computed(() => view), cardAccess: () => undefined });
		}
		const resolvedValue = ref<unknown>(props.answer);
		return () =>
			h(AutomationProposalCard, {
				proposal: props.proposal,
				disabled: props.disabled,
				resolvedValue: resolvedValue.value,
				toolCallId: 'tc-1',
				onSubmit: (body: InstanceAiConfirmRequest) => props.record(body),
			});
	},
});

function renderCard(props: {
	proposal?: Proposal;
	disabled?: boolean;
	teammate?: boolean;
	answer?: unknown;
	call?: { value: InstanceAiToolCallState | undefined };
}) {
	const sent: InstanceAiConfirmRequest[] = [];
	const rendered = renderComponent(InChat, {
		props: {
			proposal: makeLinkedProposal(),
			...props,
			record: (body: InstanceAiConfirmRequest) => sent.push(body),
		},
		global: { plugins: [createTestRouter()], stubs: { RouterLink: false } },
	});
	return { ...rendered, sent };
}

const button = (getByTestId: (id: string) => HTMLElement, id: string) =>
	getByTestId(`automation-proposal-${id}`);

describe('AutomationProposalCard with linked instances', () => {
	beforeEach(() => {
		// The settings and the module check are store functions that a stubbed Pinia would replace.
		createTestingPinia({ stubActions: false });
		resetExperienceModeState();
		clearAutomationPreflights();
		useUsersStore().currentUserId = 'user-1';
		preflightMock.mockReset();
		preflightMock.mockResolvedValue(preflight());
	});

	describe('Change', () => {
		it('shows "Change" in Power mode, with every place and the reason an offline one is off', async () => {
			useExperience('power');
			const { getByRole, findByRole } = renderCard({});

			await userEvent.click(getByRole('button', { name: 'Change where it runs' }));

			expect(await findByRole('menuitemcheckbox', { name: /^This computer/ })).toBeEnabled();
			expect(getByRole('menuitemcheckbox', { name: /^Team cloud/ })).toHaveAttribute(
				'aria-checked',
				'true',
			);
			expect(getByRole('menuitemcheckbox', { name: /^Lab · Offline/ })).toHaveAttribute(
				'aria-disabled',
				'true',
			);
			expect(document.body).toHaveTextContent('Where should it run?');
		});

		it('hides "Change" in Simple mode and shows only the recommendation', () => {
			useExperience('simple');
			const { queryByRole, getByTestId } = renderCard({});

			expect(queryByRole('button', { name: 'Change where it runs' })).not.toBeInTheDocument();
			expect(getByTestId('automation-proposal-place')).toHaveTextContent(
				'Runs on Team cloud · it keeps going when this computer is off',
			);
		});

		it('hides "Change" when the card offers only one place', () => {
			useExperience('power');
			const { queryByRole } = renderCard({ proposal: makeProposal() });

			expect(queryByRole('button', { name: 'Change where it runs' })).not.toBeInTheDocument();
		});

		it('moves the automation to this computer when the user picks it, and checks nothing', async () => {
			useExperience('power');
			const { getByRole, findByRole, getByTestId, queryByTestId, sent } = renderCard({});
			await waitFor(() => expect(preflightMock).toHaveBeenCalledTimes(1));

			await userEvent.click(getByRole('button', { name: 'Change where it runs' }));
			await userEvent.click(await findByRole('menuitemcheckbox', { name: /^This computer/ }));

			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on This computer/);
			expect(getByTestId('automation-proposal-caveat')).toHaveTextContent(
				'Only runs while this computer is on.',
			);
			expect(queryByTestId('automation-proposal-preflight')).not.toBeInTheDocument();
			await userEvent.click(button(getByTestId, 'turn-on'));
			expect(sent).toEqual([
				{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: true } },
			]);
		});
	});

	describe('check of the linked instance', () => {
		it('checks the cloud for the workflow on the card and holds the buttons until it answers', async () => {
			let answer!: (value: LinkedInstanceTransferPreflight) => void;
			preflightMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
			const { getByTestId, findByTestId } = renderCard({});

			expect(await findByTestId('automation-proposal-preflight')).toHaveTextContent(
				'Checking what Team cloud needs…',
			);
			expect(preflightMock).toHaveBeenCalledWith(expect.anything(), CLOUD_LINK_ID, {
				workflowId: 'wf-1',
			});
			expect(button(getByTestId, 'turn-on')).toBeDisabled();
			expect(button(getByTestId, 'save')).toBeDisabled();
			expect(button(getByTestId, 'not-now')).toBeEnabled();

			answer(preflight());

			await waitFor(() => expect(button(getByTestId, 'turn-on')).toBeEnabled());
			expect(button(getByTestId, 'save')).toBeEnabled();
		});

		it('says what needs setting up there, links to it, and holds "Turn it on"', async () => {
			preflightMock.mockResolvedValue(NEEDS_SLACK);
			const { getByTestId, findByTestId, getByRole, sent } = renderCard({});

			expect(await findByTestId('automation-proposal-preflight-set-up')).toHaveTextContent(
				'Needs setting up in Team cloud: Slack account',
			);
			const notice = within(getByTestId('automation-proposal-preflight'));
			expect(
				notice.getByText('Set up the missing connections first, or save it switched off.'),
			).toBeInTheDocument();
			const link = getByRole('link', { name: 'Set up in Team cloud (opens in a new tab)' });
			expect(link).toHaveAttribute('href', 'https://cloud.example.test/home/credentials');
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
			expect(button(getByTestId, 'turn-on')).toBeDisabled();
			expect(button(getByTestId, 'save')).toBeEnabled();

			await userEvent.click(button(getByTestId, 'save'));
			expect(sent).toEqual([
				{
					kind: 'capabilityDecision',
					approved: true,
					values: { target: CLOUD_LINK_ID, activate: false },
				},
			]);
		});

		it('checks again on request, and lets "Turn it on" act once the set-up is done', async () => {
			preflightMock.mockResolvedValueOnce(NEEDS_SLACK).mockResolvedValueOnce(preflight());
			const { getByTestId, findByTestId, sent } = renderCard({});
			await findByTestId('automation-proposal-preflight-set-up');

			await userEvent.click(getByTestId('automation-proposal-preflight-recheck'));

			await waitFor(() => expect(button(getByTestId, 'turn-on')).toBeEnabled());
			expect(preflightMock).toHaveBeenCalledTimes(2);
			await userEvent.click(button(getByTestId, 'turn-on'));
			expect(sent[0]).toEqual({
				kind: 'capabilityDecision',
				approved: true,
				values: { target: CLOUD_LINK_ID, activate: true },
			});
		});

		it('lets the user save or try again when the check fails', async () => {
			preflightMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(preflight());
			const { getByTestId, findByTestId, queryByTestId } = renderCard({});

			expect(await findByTestId('automation-proposal-preflight')).toHaveTextContent(
				"Couldn't check what Team cloud needs. You can still save it.",
			);
			expect(button(getByTestId, 'turn-on')).toBeEnabled();
			expect(button(getByTestId, 'save')).toBeEnabled();

			await userEvent.click(getByTestId('automation-proposal-preflight-retry'));

			await waitFor(() =>
				expect(queryByTestId('automation-proposal-preflight-retry')).not.toBeInTheDocument(),
			);
			expect(preflightMock).toHaveBeenCalledTimes(2);
		});

		it.each(['simple', 'power'] as const)(
			'holds both buttons for a workflow that cannot move there, and keeps it here on request (%s)',
			async (mode) => {
				useExperience(mode);
				preflightMock.mockResolvedValue(
					preflight({ subWorkflowCalls: [{ id: 'wf-2', name: null }] }),
				);
				const { getByTestId, findByTestId, queryByTestId, sent } = renderCard({});

				expect(await findByTestId('automation-proposal-preflight-blocked')).toHaveTextContent(
					"It can't go to Team cloud, because it calls other workflows by ID.",
				);
				expect(button(getByTestId, 'turn-on')).toBeDisabled();
				expect(button(getByTestId, 'save')).toBeDisabled();
				expect(button(getByTestId, 'not-now')).toBeEnabled();

				await userEvent.click(getByTestId('automation-proposal-preflight-keep-here'));

				expect(getByTestId('automation-proposal-place')).toHaveTextContent(
					/^Runs on This computer/,
				);
				expect(queryByTestId('automation-proposal-preflight')).not.toBeInTheDocument();
				expect(getByTestId('automation-proposal-card')).toHaveFocus();
				await userEvent.click(button(getByTestId, 'turn-on'));
				expect(sent).toEqual([
					{
						kind: 'capabilityDecision',
						approved: true,
						values: { target: 'local', activate: true },
					},
				]);
			},
		);

		it('notes credentials that the cloud did not list, without holding "Turn it on"', async () => {
			preflightMock.mockResolvedValue(
				preflight({ credentials: [{ name: 'Mail', type: 'smtp', status: 'unknown' }] }),
			);
			const { getByTestId, findByTestId } = renderCard({});

			expect(await findByTestId('automation-proposal-preflight-unchecked')).toHaveTextContent(
				"n8n couldn't check these connections in Team cloud: Mail.",
			);
			expect(button(getByTestId, 'turn-on')).toBeEnabled();
		});

		it('checks the same card version on a link once, also when the card renders again', async () => {
			const first = renderCard({});
			await waitFor(() => expect(preflightMock).toHaveBeenCalledTimes(1));
			first.unmount();

			const second = renderCard({});

			await waitFor(() => expect(button(second.getByTestId, 'turn-on')).toBeEnabled());
			expect(preflightMock).toHaveBeenCalledTimes(1);
		});

		it('checks nothing for a disabled card, an answered card or a card on this computer', async () => {
			renderCard({ disabled: true });
			renderCard({ answer: { kind: 'capabilityDecision', approved: false } });
			renderCard({ proposal: makeProposal() });
			await Promise.resolve();

			expect(preflightMock).not.toHaveBeenCalled();
		});
	});

	describe('place of the chat', () => {
		const localFirst = () => makeLinkedProposal({ recommended: makeProposal().recommended });

		it('starts with the cloud of the chat in Power mode', async () => {
			useExperience('power');
			mockedStore(useInstanceAiStore).threads = [
				chatSummary({
					runTarget: { kind: 'linked', instanceId: CLOUD_LINK_ID, name: 'Team cloud' },
				}),
			];
			const { getByTestId } = renderCard({ proposal: localFirst() });

			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on Team cloud/);
			await waitFor(() => expect(preflightMock).toHaveBeenCalledTimes(1));
		});

		it.each([
			[
				'the chat is shared',
				chatSummary({
					runTarget: { kind: 'linked', instanceId: CLOUD_LINK_ID, name: 'Team cloud' },
					sharedWith: { projectId: 'project-1', projectName: 'Sales' },
				}),
			],
			['the chat runs here', chatSummary({ runTarget: { kind: 'local' } })],
		])('keeps the recommendation when %s', (_label, chat) => {
			useExperience('power');
			mockedStore(useInstanceAiStore).threads = [chat];

			const { getByTestId } = renderCard({ proposal: localFirst() });

			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on This computer/);
		});
	});

	describe('a teammate in a shared chat', () => {
		it('keeps the automation here: no "Change", no check of the owner\'s cloud', async () => {
			useExperience('power');
			const { getByTestId, queryByRole, sent } = renderCard({ teammate: true });

			expect(queryByRole('button', { name: 'Change where it runs' })).not.toBeInTheDocument();
			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on This computer/);
			await userEvent.click(button(getByTestId, 'save'));

			expect(preflightMock).not.toHaveBeenCalled();
			expect(sent[0]).toEqual({
				kind: 'capabilityDecision',
				approved: true,
				values: { target: 'local', activate: false },
			});
		});
	});

	describe('after the answer', () => {
		const turnOnThere = {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: CLOUD_LINK_ID, activate: true },
		};

		it('says that it is on in the cloud and opens the copy there in a new tab', () => {
			const call = {
				value: {
					toolCallId: 'tc-1',
					toolName: 'propose_automation',
					args: {},
					isLoading: false,
					result: {
						workflowId: 'remote-9',
						url: REMOTE_URL,
						active: true,
						kept: true,
						place: { targetId: CLOUD_LINK_ID, kind: 'linked', name: 'Team cloud' },
					},
				} as unknown as InstanceAiToolCallState,
			};

			const { getByTestId, getByRole, queryByTestId } = renderCard({ answer: turnOnThere, call });

			expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
				`It's on. "Morning digest" runs at 08:00, Monday through Friday (United Kingdom Time) on Team cloud.`,
			);
			const link = getByRole('link', {
				name: 'Open "Morning digest" in Team cloud (opens in a new tab)',
			});
			expect(link).toHaveAttribute('href', REMOTE_URL);
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveTextContent('Open in Team cloud');
			expect(queryByTestId('automation-proposal-open-workflow')).not.toBeInTheDocument();
		});

		it('says where a saved copy is, and links nowhere until the result arrives', () => {
			const save = { ...turnOnThere, values: { target: CLOUD_LINK_ID, activate: false } };

			const { getByTestId, queryByRole } = renderCard({ answer: save });

			expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
				'Saved in Team cloud. "Morning digest" is off until you turn it on there.',
			);
			expect(queryByRole('link')).not.toBeInTheDocument();
		});
	});
});
