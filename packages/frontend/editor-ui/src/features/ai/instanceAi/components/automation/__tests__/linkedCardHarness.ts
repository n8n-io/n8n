import { computed, defineComponent, h, ref, type PropType } from 'vue';
import { expect, vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
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
import { fetchLinkedInstances } from '@/features/linkedInstances/linkedInstances.api';
import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';
import { fetchTransferPreflight } from '@/features/linkedInstances/transfer/transfer.api';
import { resetExperienceModeState } from '../../../experience/useExperienceMode';
import { provideThread, type ThreadRuntime } from '../../../instanceAi.store';
import { createTestRouter } from '../../../navigation/__tests__/navigationFixtures';
import { provideThreadSharingContext } from '../../../sharing/threadSharingContext';
import type { ThreadSharingView } from '../../../sharing/sharingView';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { clearAutomationPreflights } from '../useAutomationPreflight';
import { makeLinkedProposal, OWNER_LINKS, serverCard } from './automationProposalFixtures';

/**
 * The card in a chat with linked instances, for the component tests of the card. A test file that
 * uses it mocks `transfer.api` and `linkedInstances.api` with `vi.mock`, so that these functions
 * are the mocks of that file.
 */

export const THREAD_ID = 'thread-1';
export const REMOTE_URL = 'https://cloud.example.test/workflow/remote-9';
export const preflightMock = vi.mocked(fetchTransferPreflight);
export const linksMock = vi.mocked(fetchLinkedInstances);

export function preflight(
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

export const NEEDS_SLACK = preflight({
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

/** A fresh store, the owner's links, and a check of the cloud that finds nothing to report. */
export function resetLinkedCardWorld() {
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
}

export function useExperience(defaultMode: 'simple' | 'power') {
	const settingsStore = useSettingsStore();
	settingsStore.moduleSettings = {
		'instance-ai': { enabled: true, experience: { enabled: true, defaultMode } },
	} as unknown as typeof settingsStore.moduleSettings;
}

export function chatSummary(
	overrides: Partial<InstanceAiThreadSummary> = {},
): InstanceAiThreadSummary {
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

export function renderCard(props: {
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

export const button = (getByTestId: (id: string) => HTMLElement, id: string) =>
	getByTestId(`automation-proposal-${id}`);

/** Waits for the text: the card names a link once the viewer's own list of links arrives. */
export async function expectText(element: () => HTMLElement, text: string | RegExp) {
	await waitFor(() => expect(element()).toHaveTextContent(text));
}
