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
import { fetchLinkedInstances } from '@/features/linkedInstances/linkedInstances.api';
import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';
import { fetchTransferPreflight } from '@/features/linkedInstances/transfer/transfer.api';
import { resetExperienceModeState } from '../../../experience/useExperienceMode';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../../instanceAi.store';
import { createTestRouter } from '../../../navigation/__tests__/navigationFixtures';
import { provideThreadSharingContext } from '../../../sharing/threadSharingContext';
import type { ThreadSharingView } from '../../../sharing/sharingView';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { clearAutomationPreflights } from '../useAutomationPreflight';
import {
	CLOUD_LINK_ID,
	makeLinkedProposal,
	makeProposal,
	OWNER_LINKS,
	serverCard,
} from './automationProposalFixtures';

vi.mock('@/features/linkedInstances/transfer/transfer.api', () => ({
	fetchTransferPreflight: vi.fn(),
	moveWorkflow: vi.fn(),
}));

vi.mock('@/features/linkedInstances/linkedInstances.api', () => ({
	fetchLinkedInstances: vi.fn(),
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
const linksMock = vi.mocked(fetchLinkedInstances);

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

/** The linked-instances module is on, so the card reads the viewer's own links. */
function turnOnLinkedInstances() {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: [LINKED_INSTANCES_MODULE_ID],
	} as typeof settingsStore.settings;
}

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
			...props,
			// The chat gets the card from the server, which names no link.
			proposal: serverCard(props.proposal ?? makeLinkedProposal()),
			record: (body: InstanceAiConfirmRequest) => sent.push(body),
		},
		global: { plugins: [createTestRouter()], stubs: { RouterLink: false } },
	});
	return { ...rendered, sent };
}

const button = (getByTestId: (id: string) => HTMLElement, id: string) =>
	getByTestId(`automation-proposal-${id}`);

/** Waits for the text: the card names a link once the viewer's own list of links arrives. */
async function expectText(element: () => HTMLElement, text: string | RegExp) {
	await waitFor(() => expect(element()).toHaveTextContent(text));
}

describe('AutomationProposalCard with linked instances', () => {
	beforeEach(() => {
		// The settings and the module check are store functions that a stubbed Pinia would replace.
		createTestingPinia({ stubActions: false });
		resetExperienceModeState();
		clearAutomationPreflights();
		useUsersStore().currentUserId = 'user-1';
		turnOnLinkedInstances();
		preflightMock.mockReset();
		preflightMock.mockResolvedValue(preflight());
		linksMock.mockReset();
		linksMock.mockResolvedValue(OWNER_LINKS);
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

		it('hides "Change" in Simple mode and shows only the recommendation', async () => {
			useExperience('simple');
			const { queryByRole, getByTestId } = renderCard({});

			expect(queryByRole('button', { name: 'Change where it runs' })).not.toBeInTheDocument();
			await expectText(
				() => getByTestId('automation-proposal-place'),
				'Runs on Team cloud · it keeps going when this computer is off',
			);
			expect(linksMock).toHaveBeenCalledTimes(1);
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

			await findByTestId('automation-proposal-preflight');
			await expectText(
				() => getByTestId('automation-proposal-preflight'),
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

			await findByTestId('automation-proposal-preflight-set-up');
			await expectText(
				() => getByTestId('automation-proposal-preflight-set-up'),
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

			await findByTestId('automation-proposal-preflight-retry');
			await expectText(
				() => getByTestId('automation-proposal-preflight'),
				"Couldn't check what Team cloud needs. n8n checks again when it copies the workflow.",
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

				await findByTestId('automation-proposal-preflight-blocked');
				await expectText(
					() => getByTestId('automation-proposal-preflight-blocked'),
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

			await findByTestId('automation-proposal-preflight-unchecked');
			await expectText(
				() => getByTestId('automation-proposal-preflight-unchecked'),
				"n8n couldn't check these connections in Team cloud: Mail.",
			);
			expect(button(getByTestId, 'turn-on')).toBeEnabled();
		});

		it('lists the credentials that need set-up and the ones it could not check, together', async () => {
			preflightMock.mockResolvedValue(
				preflight({
					credentials: [
						{ name: 'Slack account', type: 'slackApi', status: 'needs-set-up' },
						{ name: 'Mail', type: 'smtp', status: 'unknown' },
					],
				}),
			);
			const { getByTestId, findByTestId } = renderCard({});

			await findByTestId('automation-proposal-preflight-set-up');
			expect(getByTestId('automation-proposal-preflight-unchecked')).toHaveTextContent(
				'Mail. They may need setting up there.',
			);
			expect(button(getByTestId, 'turn-on')).toBeDisabled();
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

			await expectText(() => getByTestId('automation-proposal-place'), /^Runs on Team cloud/);
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

	describe('a shared chat', () => {
		it("names the owner's links in words for a teammate, whose own list does not hold them", async () => {
			linksMock.mockResolvedValue([]);
			const { getByTestId } = renderCard({
				teammate: true,
				answer: {
					kind: 'capabilityDecision',
					approved: true,
					values: { target: CLOUD_LINK_ID, activate: false },
				},
			});
			await waitFor(() => expect(linksMock).toHaveBeenCalled());

			const status = getByTestId('automation-proposal-resolved-status');
			expect(status).toHaveTextContent('Saved in Another n8n instance.');
			expect(document.body).not.toHaveTextContent('Team cloud');
		});

		it("gives a teammate no link to the owner's copy, whose address names the owner's link", async () => {
			linksMock.mockResolvedValue([]);
			const { getByTestId, queryByRole } = renderCard({
				teammate: true,
				answer: {
					kind: 'capabilityDecision',
					approved: true,
					values: { target: CLOUD_LINK_ID, activate: true },
				},
				call: {
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
				},
			});
			await waitFor(() => expect(linksMock).toHaveBeenCalled());

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				/^It's on\. "Morning digest" runs .* on Another n8n instance\.$/,
			);
			expect(queryByRole('link')).not.toBeInTheDocument();
			expect(document.body.innerHTML).not.toContain('cloud.example.test');
		});

		it('keeps the automation here for the owner of a chat that was shared after the card', async () => {
			useExperience('power');
			mockedStore(useInstanceAiStore).threads = [
				chatSummary({ sharedWith: { projectId: 'project-1', projectName: 'Sales' } }),
			];
			const { getByTestId, queryByRole, sent } = renderCard({});

			expect(queryByRole('button', { name: 'Change where it runs' })).not.toBeInTheDocument();
			expect(getByTestId('automation-proposal-place')).toHaveTextContent(/^Runs on This computer/);
			await userEvent.click(button(getByTestId, 'turn-on'));

			expect(preflightMock).not.toHaveBeenCalled();
			expect(sent[0]).toEqual({
				kind: 'capabilityDecision',
				approved: true,
				values: { target: 'local', activate: true },
			});
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
		const toolCall = (result?: Record<string, unknown>, error?: string) => ({
			value: {
				toolCallId: 'tc-1',
				toolName: 'propose_automation',
				args: {},
				isLoading: result === undefined && error === undefined,
				...(result && { result }),
				...(error && { error }),
			} as unknown as InstanceAiToolCallState,
		});
		const remoteResult = (overrides: Record<string, unknown> = {}) => ({
			workflowId: 'remote-9',
			url: REMOTE_URL,
			active: true,
			kept: true,
			place: { targetId: CLOUD_LINK_ID, kind: 'linked' },
			...overrides,
		});
		const turnOnThere = {
			kind: 'capabilityDecision',
			approved: true,
			values: { target: CLOUD_LINK_ID, activate: true },
		};

		it('says that it is on in the cloud and opens the copy there in a new tab', async () => {
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

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
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

		it('says where a saved copy is when the card cannot read its tool step', async () => {
			const save = { ...turnOnThere, values: { target: CLOUD_LINK_ID, activate: false } };

			const { getByTestId, queryByRole } = renderCard({ answer: save });

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'Saved in Team cloud. "Morning digest" is off until you turn it on there.',
			);
			expect(queryByRole('link')).not.toBeInTheDocument();
		});

		it('says that it copies a saved workflow while the tool step runs, without a link', async () => {
			const save = { ...turnOnThere, values: { target: CLOUD_LINK_ID, activate: false } };

			const { getByTestId, queryByRole } = renderCard({ answer: save, call: toolCall() });

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'Copying "Morning digest" to Team cloud…',
			);
			expect(getByTestId('automation-proposal-resolved-status')).toHaveAttribute(
				'data-status',
				'copying',
			);
			expect(queryByRole('link')).not.toBeInTheDocument();
		});

		it('says that a saved copy of a live workflow is there and the workflow keeps running here', async () => {
			const save = { ...turnOnThere, values: { target: CLOUD_LINK_ID, activate: false } };

			const { getByTestId, findByRole } = renderCard({
				proposal: makeLinkedProposal({ active: true }),
				answer: save,
				call: toolCall(remoteResult({ active: false })),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'Saved a copy in Team cloud. "Morning digest" keeps running on this computer.',
			);
			expect(
				await findByRole('link', { name: /Team cloud \(opens in a new tab\)/ }),
			).toHaveAttribute('href', REMOTE_URL);
		});

		it('warns when the copy is on there but the workflow here still runs, and links here', async () => {
			const { getByTestId, getByRole } = renderCard({
				proposal: makeLinkedProposal({ active: true }),
				answer: turnOnThere,
				call: toolCall(remoteResult({ error: 'still runs here', problems: ['still-on-here'] })),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'"Morning digest" is on in Team cloud, but it still runs on this computer too. Turn it off here so that it doesn\'t run twice.',
			);
			expect(getByRole('link', { name: 'Open workflow "Morning digest"' })).toHaveAttribute(
				'href',
				'/workflow/wf-1',
			);
		});

		it('says that the workflow here keeps running until the copy there is set up, and opens the copy', async () => {
			const { getByTestId, findByRole } = renderCard({
				proposal: makeLinkedProposal({ active: true }),
				answer: turnOnThere,
				call: toolCall(
					remoteResult({ error: 'needs set-up there', problems: ['not-ready', 'kept-on-here'] }),
				),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'"Morning digest" is on in Team cloud, but it needs setting up there before it can run, so it keeps running on this computer. Set it up there, then turn it off here.',
			);
			expect(getByTestId('automation-proposal-resolved-status')).toHaveAttribute(
				'data-status',
				'not-ready',
			);
			expect(
				await findByRole('link', { name: /Team cloud \(opens in a new tab\)/ }),
			).toHaveAttribute('href', REMOTE_URL);
		});

		it('adds that n8n could not keep the workflow here, also after a copy that went well', async () => {
			const { getByTestId } = renderCard({
				answer: turnOnThere,
				call: toolCall(remoteResult({ error: 'not kept here', problems: ['not-kept-here'] })),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				`It's on. "Morning digest" runs at 08:00, Monday through Friday (United Kingdom Time) on Team cloud. n8n couldn't keep it on this computer, so it may be archived here when this run ends.`,
			);
			expect(getByTestId('automation-proposal-resolved')).toHaveClass(/warning/);
		});

		it('says that a failed copy changed nothing here, and links nowhere', async () => {
			const { getByTestId, queryByRole } = renderCard({
				answer: turnOnThere,
				call: toolCall(undefined, 'Could not copy'),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'Couldn\'t copy "Morning digest" to Team cloud. Nothing changed here.',
			);
			expect(queryByRole('link')).not.toBeInTheDocument();
		});

		it('names the time zone of the cloud for a schedule without a zone of its own', async () => {
			const proposal = makeLinkedProposal({
				trigger: {
					kind: 'schedule',
					cron: '0 8 * * 1-5',
					timezone: 'Europe/London',
					timezoneIsDefault: true,
				},
			});

			const { getByTestId } = renderCard({
				proposal,
				answer: turnOnThere,
				call: toolCall(remoteResult()),
			});

			await expectText(
				() => getByTestId('automation-proposal-resolved-status'),
				'It\'s on. "Morning digest" runs at 08:00, Monday through Friday (Team cloud time) on Team cloud.',
			);
		});
	});

	describe('a workflow that is live here', () => {
		const LIVE = { active: true, hasUnpublishedChanges: false };
		const ANSWER_BUTTONS = ['turn-on', 'save', 'not-now'].map((id) => `automation-proposal-${id}`);
		/** The labels of the answer buttons, without "Change". */
		const answerLabels = (buttons: HTMLElement[]) =>
			buttons
				.filter((entry) => ANSWER_BUTTONS.includes(entry.dataset.testId ?? ''))
				.map((entry) => entry.textContent?.trim());

		it('offers to move it to the cloud and turn it on there, and says that it turns off here', async () => {
			const { getByTestId, getByRole, getAllByRole, sent } = renderCard({
				proposal: makeLinkedProposal(LIVE),
			});

			await waitFor(() =>
				expect(
					getByRole('group', { name: 'Move this automation to Team cloud?' }),
				).toBeInTheDocument(),
			);
			expect(getByTestId('automation-proposal-status')).toHaveTextContent(
				"It runs on this computer now. Once it's on in Team cloud, it turns off here.",
			);
			expect(answerLabels(getAllByRole('button'))).toEqual([
				'Move and turn it on',
				'Only save a copy',
				'Not now',
			]);
			await waitFor(() => expect(button(getByTestId, 'turn-on')).toBeEnabled());

			await userEvent.click(button(getByTestId, 'turn-on'));

			expect(sent).toEqual([
				{
					kind: 'capabilityDecision',
					approved: true,
					values: { target: CLOUD_LINK_ID, activate: true },
				},
			]);
		});

		it('keeps the copy of a live workflow here when the user picks this computer', async () => {
			useExperience('power');
			const { getByRole, findByRole, getByTestId, getAllByRole } = renderCard({
				proposal: makeLinkedProposal(LIVE),
			});

			await userEvent.click(getByRole('button', { name: 'Change where it runs' }));
			await userEvent.click(await findByRole('menuitemcheckbox', { name: /^This computer/ }));

			expect(getByRole('group', { name: 'Keep this automation?' })).toBeInTheDocument();
			expect(getByTestId('automation-proposal-status')).toHaveTextContent("It's on now.");
			expect(answerLabels(getAllByRole('button'))).toEqual(['Save workflow', 'Not now']);
		});
	});

	describe('who can see it', () => {
		it('names the project that the copy goes to in the cloud once the check answers', async () => {
			let answer!: (value: LinkedInstanceTransferPreflight) => void;
			preflightMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
			const { getByTestId, queryByTestId } = renderCard({});
			await waitFor(() => expect(preflightMock).toHaveBeenCalled());

			// The projects here say nothing about who can see the copy there.
			expect(queryByTestId('automation-proposal-visible-to')).not.toBeInTheDocument();
			answer(preflight({ targetProject: { id: 'rp-1', name: 'Sales' } }));

			await expectText(
				() => getByTestId('automation-proposal-visible-to'),
				'Visible to: Sales in Team cloud',
			);
		});

		it('names the personal project there when the link has no default project', async () => {
			const { getByTestId } = renderCard({});

			await expectText(
				() => getByTestId('automation-proposal-visible-to'),
				'Visible to: Personal in Team cloud',
			);
		});

		it('names the project of the link in words when the check fails', async () => {
			preflightMock.mockRejectedValue(new Error('offline'));
			const { getByTestId } = renderCard({});

			await expectText(
				() => getByTestId('automation-proposal-visible-to'),
				'Visible to: the project for new automations in Team cloud',
			);
		});

		it('names no project for a workflow that cannot go to the cloud', async () => {
			preflightMock.mockResolvedValue(
				preflight({
					targetProject: { id: 'rp-1', name: 'Sales' },
					subWorkflowCalls: [{ id: 'wf-2', name: null }],
				}),
			);
			const { findByTestId, queryByTestId } = renderCard({});

			await findByTestId('automation-proposal-preflight-blocked');
			expect(queryByTestId('automation-proposal-visible-to')).not.toBeInTheDocument();
		});

		it('names the projects here again when the user picks this computer', async () => {
			useExperience('power');
			const { getByRole, findByRole, getByTestId } = renderCard({});

			await userEvent.click(getByRole('button', { name: 'Change where it runs' }));
			await userEvent.click(await findByRole('menuitemcheckbox', { name: /^This computer/ }));

			expect(getByTestId('automation-proposal-visible-to')).toHaveTextContent('Visible to: Ops');
		});
	});
});
