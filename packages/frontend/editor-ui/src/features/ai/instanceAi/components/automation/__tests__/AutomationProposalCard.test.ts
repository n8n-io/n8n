import { defineComponent, h, nextTick, ref, type PropType, type Ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type {
	AutomationProposalCard as Proposal,
	InstanceAiConfirmRequest,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { provideThread, type ThreadRuntime } from '../../../instanceAi.store';
import { createTestRouter } from '../../../navigation/__tests__/navigationFixtures';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { makeManualProposal, makeProposal } from './automationProposalFixtures';

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'nodeName', 'size'],
		template: '<span data-test-id="node-icon" />',
	},
}));

// AutomationProposalSteps.test.ts covers the real icons and the load of the node types.
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) =>
			type === 'n8n-nodes-base.slack' ? { displayName: 'Slack' } : null,
		loadNodeTypesIfNotLoaded: async () => {},
	}),
}));

const renderComponent = createComponentRenderer(AutomationProposalCard, {
	pinia: createTestingPinia(),
});

function renderCard(proposal: Proposal, disabled = false) {
	return renderComponent({ props: { proposal, disabled } });
}

const buttonLabels = (buttons: HTMLElement[]) =>
	buttons.map((button) => button.textContent?.trim());

describe('AutomationProposalCard', () => {
	it('shows the schedule, the steps, the place and who can see it', () => {
		const { getByRole, getByTestId, queryByTestId } = renderCard(makeProposal());

		const card = getByRole('group', { name: 'Want this to happen automatically?' });
		expect(card).toBe(getByTestId('automation-proposal-card'));
		expect(getByTestId('automation-proposal-name')).toHaveTextContent('Morning digest');
		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs at 08:00, Monday through Friday (United Kingdom Time)',
		);
		expect(getByTestId('automation-proposal-place')).toHaveTextContent(
			'Runs on This computer · Only runs while this computer is on.',
		);
		expect(queryByTestId('automation-proposal-caveat')).not.toBeInTheDocument();
		expect(getByTestId('automation-proposal-visible-to')).toHaveTextContent('Visible to: Ops');

		const steps = within(getByRole('list', { name: 'Steps' }));
		expect(steps.getByRole('img', { name: 'Every weekday' })).toBeInTheDocument();
		expect(steps.getByRole('img', { name: 'Send digest' })).toBeInTheDocument();
	});

	it('offers the buttons in the order turn on, save switched off, not now', () => {
		const { getAllByRole } = renderCard(makeProposal());

		expect(buttonLabels(getAllByRole('button'))).toEqual([
			'Turn it on',
			'Save, but leave it off',
			'Not now',
		]);
	});

	it('asks to keep a manual workflow, without a trigger line or "Turn it on"', () => {
		const { getByRole, getAllByRole, queryByTestId, queryByText } = renderCard(
			makeManualProposal(),
		);

		expect(getByRole('group', { name: 'Keep this as a workflow?' })).toBeInTheDocument();
		expect(queryByTestId('automation-proposal-trigger')).not.toBeInTheDocument();
		expect(queryByText('Turn it on')).not.toBeInTheDocument();
		expect(buttonLabels(getAllByRole('button'))).toEqual(['Save workflow', 'Not now']);
		expect(queryByTestId('automation-proposal-turn-on')).not.toBeInTheDocument();
		expect(getByRole('button', { name: 'Save workflow' })).toBe(getAllByRole('button').at(0));
		// The title says it already, so there is no note about turning it on.
		expect(queryByTestId('automation-proposal-note')).not.toBeInTheDocument();
	});

	it('says why a schedule cannot be turned on from the card', () => {
		const { getByRole, getAllByRole, getByTestId } = renderCard(
			makeProposal({ canActivate: false, offered: { target: ['local'], activate: [false] } }),
		);

		expect(getByRole('group', { name: 'Keep this as a workflow?' })).toBeInTheDocument();
		expect(getByTestId('automation-proposal-note')).toHaveTextContent(
			"You can't turn it on from here. It stays off until someone turns it on.",
		);
		expect(buttonLabels(getAllByRole('button'))).toEqual(['Save workflow', 'Not now']);
	});

	it('offers to make saved changes live for a workflow that is on', async () => {
		const { getByRole, getAllByRole, getByTestId, queryByTestId, emitted } = renderCard(
			makeProposal({ active: true, hasUnpublishedChanges: true }),
		);

		expect(getByRole('group', { name: 'Make your changes live?' })).toBeInTheDocument();
		expect(getByTestId('automation-proposal-status')).toHaveTextContent(
			"It's on now. Your latest changes aren't live yet.",
		);
		expect(queryByTestId('automation-proposal-note')).not.toBeInTheDocument();
		expect(buttonLabels(getAllByRole('button'))).toEqual([
			'Make changes live',
			'Save, but keep the live version',
			'Not now',
		]);

		await fireEvent.click(getByRole('button', { name: 'Make changes live' }));

		expect(emitted().submit).toEqual([
			[{ kind: 'capabilityDecision', approved: true, values: { target: 'local', activate: true } }],
		]);
	});

	it('only offers to keep a workflow whose saved version is on already', () => {
		const { getByRole, getAllByRole, getByTestId, queryByText } = renderCard(
			makeProposal({ active: true }),
		);

		// The workflow is on already, so the title does not ask to keep it "as a workflow".
		expect(getByRole('group', { name: 'Keep this automation?' })).toBeInTheDocument();
		expect(queryByText('Keep this as a workflow?')).not.toBeInTheDocument();
		expect(getByTestId('automation-proposal-status').textContent?.trim()).toBe("It's on now.");
		expect(buttonLabels(getAllByRole('button'))).toEqual(['Save workflow', 'Not now']);
		expect(queryByText(/leave it off/)).not.toBeInTheDocument();
	});

	it.each([
		['automation-proposal-turn-on', { target: 'local', activate: true }],
		['automation-proposal-save', { target: 'local', activate: false }],
	])('sends the values that %s chose', async (testId, values) => {
		const { getByTestId, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId(testId));

		expect(emitted().submit).toEqual([[{ kind: 'capabilityDecision', approved: true, values }]]);
	});

	it('declines with "Not now"', async () => {
		const { getByTestId, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId('automation-proposal-not-now'));

		expect(emitted().submit).toEqual([[{ kind: 'capabilityDecision', approved: false }]]);
	});

	it('saves a manual workflow switched off', async () => {
		const { getByRole, emitted } = renderCard(makeManualProposal());

		await fireEvent.click(getByRole('button', { name: 'Save workflow' }));

		expect(emitted().submit).toEqual([
			[
				{
					kind: 'capabilityDecision',
					approved: true,
					values: { target: 'local', activate: false },
				},
			],
		]);
	});

	it('sends one answer and then disables the buttons', async () => {
		const { getByTestId, getAllByRole, emitted } = renderCard(makeProposal());

		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		await fireEvent.click(getByTestId('automation-proposal-not-now'));

		expect(emitted().submit).toHaveLength(1);
		for (const button of getAllByRole('button')) expect(button).toBeDisabled();
	});

	it('disables every button and sends nothing while the card is disabled', async () => {
		const { getAllByRole, emitted } = renderCard(makeProposal(), true);

		const buttons = getAllByRole('button');
		expect(buttons).toHaveLength(3);
		for (const button of buttons) {
			expect(button).toBeDisabled();
			await fireEvent.click(button);
		}
		expect(emitted().submit).toBeUndefined();
	});

	it('adds the caveat on its own line after a local need', () => {
		const { getByTestId, getAllByText } = renderCard(
			makeProposal({
				recommended: { targetId: 'local', kind: 'local', reasons: ['needs-local-files'] },
			}),
		);

		expect(getByTestId('automation-proposal-place')).toHaveTextContent(
			'Runs on This computer · it needs files on this computer',
		);
		expect(getByTestId('automation-proposal-caveat')).toHaveTextContent(
			'Only runs while this computer is on.',
		);
		expect(getAllByText(/Only runs while this computer is on/)).toHaveLength(1);
	});

	it('names the place without a reason when the first reason has no text', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				trigger: { kind: 'other' },
				recommended: { targetId: 'local', kind: 'local', reasons: ['manual-only'] },
			}),
		);

		expect(getByTestId('automation-proposal-place').textContent?.trim()).toBe(
			'Runs on This computer',
		);
		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs when its trigger fires',
		);
	});

	it('names a linked instance by its label', () => {
		const { getByTestId, queryByTestId } = renderCard(
			makeProposal({
				recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
				targets: [{ id: 'cloud-1', kind: 'linked', label: 'Team cloud', status: 'online' }],
				offered: { target: ['cloud-1'], activate: [true, false] },
			}),
		);

		expect(getByTestId('automation-proposal-place').textContent?.trim()).toBe('Runs on Team cloud');
		expect(queryByTestId('automation-proposal-caveat')).not.toBeInTheDocument();
	});

	it('names a linked instance without a label in words, not by its id', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
				targets: [{ id: 'cloud-1', kind: 'linked', status: 'online' }],
				offered: { target: ['cloud-1'], activate: [true, false] },
			}),
		);

		expect(getByTestId('automation-proposal-place').textContent?.trim()).toBe(
			'Runs on Another n8n instance',
		);
	});

	it('describes a trigger without a schedule by its kind', () => {
		const { getByTestId } = renderCard(makeProposal({ trigger: { kind: 'webhook' } }));

		expect(getByTestId('automation-proposal-trigger')).toHaveTextContent(
			'Runs when a request arrives',
		);
	});

	it('falls back to the schedule line for a cron it cannot describe', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				trigger: { kind: 'schedule', cron: 'not a cron', timezone: 'Europe/London' },
			}),
		);

		expect(getByTestId('automation-proposal-trigger').textContent?.trim()).toBe(
			'Runs on a schedule',
		);
	});

	it('names a time zone in words, not by its id with underscores', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				trigger: { kind: 'schedule', cron: '0 8 * * *', timezone: 'America/Los_Angeles' },
			}),
		);

		const trigger = getByTestId('automation-proposal-trigger');
		expect(trigger.textContent?.trim()).toBe('Runs at 08:00 (Pacific Time)');
		expect(trigger).not.toHaveTextContent('_');
	});

	it('leaves out the time zone when the card has none', () => {
		const { getByTestId } = renderCard(
			makeProposal({ trigger: { kind: 'schedule', cron: '*/15 * * * *' } }),
		);

		expect(getByTestId('automation-proposal-trigger').textContent?.trim()).toBe(
			'Runs every 15 minutes',
		);
	});

	it('labels a step without a name by its node type and counts the hidden steps', () => {
		const { getByRole } = renderCard(
			makeProposal({ steps: [{ name: '', type: 'n8n-nodes-base.slack' }], stepCount: 4 }),
		);

		const steps = within(getByRole('list', { name: 'Steps' }));
		expect(steps.getByRole('img', { name: 'Slack' })).toBeInTheDocument();
		expect(steps.getByText('+3 more')).toBeInTheDocument();
	});

	it('shows only the name of a personal project', () => {
		const { getByTestId } = renderCard(
			makeProposal({
				visibleTo: {
					projectId: 'project-2',
					projectName: 'Jane Doe <jane@example.com>',
					projectType: 'personal',
				},
			}),
		);

		expect(getByTestId('automation-proposal-visible-to').textContent?.trim()).toBe(
			'Visible to: Jane Doe',
		);
	});

	it.each([
		[1, 'Visible to: Ops and 1 other project'],
		[12, 'Visible to: Ops and 12 other projects'],
	])('counts the %s other projects that the workflow is shared with', (total, text) => {
		const shared = { projectId: 'project-3', projectName: 'Sales', projectType: 'team' as const };
		const { getByTestId } = renderCard(makeProposal({ sharedWith: { projects: [shared], total } }));

		expect(getByTestId('automation-proposal-visible-to')).toHaveTextContent(text);
	});

	it('keeps the full name of a long project for the badge tooltip and screen readers', () => {
		const projectName = 'Customer Success Operations and Lifecycle Automation EMEA 2026';
		const { getByTestId, getByTitle } = renderCard(
			makeProposal({ visibleTo: { projectId: 'project-4', projectName, projectType: 'team' } }),
		);

		expect(getByTitle(projectName)).toHaveTextContent(projectName);
		expect(getByTestId('automation-proposal-visible-to')).toHaveTextContent(projectName);
	});
});

const TURN_ON = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: true },
};
const SAVE = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: false },
};
const DECLINE = { kind: 'capabilityDecision', approved: false };
const KEPT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };

/** The tool call that the thread mirror holds for the card, as the Assistant chat fills it. */
function toolCall(fields: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'propose_automation',
		args: {},
		isLoading: false,
		...fields,
	};
}

/** A chat that holds the card, so the card can read the result of its tool call. */
const InChat = defineComponent({
	props: {
		proposal: { type: Object as PropType<Proposal>, required: true },
		answer: { type: null, default: undefined },
		call: {
			type: Object as PropType<{ value: InstanceAiToolCallState | undefined }>,
			default: undefined,
		},
		/** The answer that the chat holds, so a test can take it back as a failed request does. */
		state: { type: Object as PropType<Ref<unknown>>, default: undefined },
	},
	setup(props) {
		const call = props.call;
		if (call) {
			provideThread({
				id: 'thread-1',
				// Like the thread runtime: a tool name skips the calls of other tools.
				findToolCall: (id: string, toolName?: string) =>
					id === 'tc-1' && (toolName === undefined || call.value?.toolName === toolName)
						? call.value
						: undefined,
			} as unknown as ThreadRuntime);
		}
		// The chat resolves the card with the answer that the card sends.
		const resolvedValue = props.state ?? ref<unknown>(props.answer);
		const onSubmit = (body: InstanceAiConfirmRequest) => {
			resolvedValue.value = body;
		};
		return () =>
			h(AutomationProposalCard, {
				proposal: props.proposal,
				resolvedValue: resolvedValue.value,
				toolCallId: 'tc-1',
				onSubmit,
			});
	},
});

const renderInChat = createComponentRenderer(InChat, { pinia: createTestingPinia() });

function renderAnswered(
	answer: unknown,
	{
		proposal = makeProposal(),
		call,
		state,
	}: {
		proposal?: Proposal;
		call?: { value: InstanceAiToolCallState | undefined };
		state?: Ref<unknown>;
	} = {},
) {
	return renderInChat({
		props: { proposal, answer, call, state },
		global: { plugins: [createTestRouter()], stubs: { RouterLink: false } },
	});
}

describe('AutomationProposalCard after the answer', () => {
	it('says that it is on, when and where it runs, and links to the workflow', () => {
		const { getByTestId, getByRole, queryByTestId, queryAllByRole } = renderAnswered(TURN_ON);

		expect(queryByTestId('automation-proposal-card')).not.toBeInTheDocument();
		expect(queryAllByRole('button')).toHaveLength(0);
		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			`It's on. "Morning digest" runs at 08:00, Monday through Friday (United Kingdom Time) on This computer.`,
		);
		const link = getByRole('link', { name: 'Open workflow "Morning digest"' });
		expect(link).toBe(getByTestId('automation-proposal-open-workflow'));
		expect(link).toHaveAttribute('href', '/workflow/wf-1');
		expect(link).toHaveTextContent('Open workflow');
	});

	it('names the trigger of a workflow without a schedule, and a linked place by its label', () => {
		const proposal = makeProposal({
			trigger: { kind: 'webhook' },
			recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
			targets: [{ id: 'cloud-1', kind: 'linked', label: 'Cloud', status: 'online' }],
			offered: { target: ['cloud-1'], activate: [true, false] },
		});
		const { getByTestId } = renderAnswered(TURN_ON, { proposal });

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			`It's on. "Morning digest" runs when a request arrives on Cloud.`,
		);
	});

	it('says that a saved workflow is off until the user turns it on', () => {
		const { getByTestId } = renderAnswered(SAVE);

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			'Saved. "Morning digest" is off until you turn it on.',
		);
		expect(getByTestId('automation-proposal-open-workflow')).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
	});

	it('says that "Save" keeps the live version of a live workflow running', () => {
		const proposal = makeProposal({ active: true, hasUnpublishedChanges: true });
		const { getByTestId } = renderAnswered(SAVE, { proposal });

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			'Saved. The live version of "Morning digest" keeps running.',
		);
	});

	it('says that a saved manual workflow is in the workflows, without asking to turn it on', async () => {
		const { getByTestId, getByRole } = renderAnswered(undefined, {
			proposal: makeManualProposal(),
		});

		await fireEvent.click(getByRole('button', { name: 'Save workflow' }));

		const status = getByTestId('automation-proposal-resolved-status');
		expect(status).toHaveTextContent('Saved. "Morning digest" is in your workflows.');
		expect(status).not.toHaveTextContent('turn it on');
		expect(getByTestId('automation-proposal-open-workflow')).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
	});

	it('says that a saved workflow stays off until someone turns it on, as the card said', async () => {
		const proposal = makeProposal({
			canActivate: false,
			offered: { target: ['local'], activate: [false] },
		});
		const { getByTestId, getByRole } = renderAnswered(undefined, { proposal });
		expect(getByTestId('automation-proposal-note')).toHaveTextContent(
			'It stays off until someone turns it on.',
		);

		await fireEvent.click(getByRole('button', { name: 'Save workflow' }));

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			'Saved. "Morning digest" stays off until someone turns it on.',
		);
		expect(getByTestId('automation-proposal-open-workflow')).toBeInTheDocument();
	});

	it('says that a schedule it cannot describe runs at set times', () => {
		const proposal = makeProposal({ trigger: { kind: 'schedule', cron: 'not a cron' } });
		const { getByTestId } = renderAnswered(TURN_ON, { proposal });

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			`It's on. "Morning digest" runs at set times on This computer.`,
		);
	});

	it('says "Not automated." for "Not now", without a link', () => {
		const { getByTestId, queryByRole, queryByTestId } = renderAnswered(DECLINE);

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent('Not automated.');
		expect(queryByTestId('automation-proposal-open-workflow')).not.toBeInTheDocument();
		expect(queryByRole('link')).not.toBeInTheDocument();
	});

	it('says "Turning it on…" until the tool result arrives, then that it is on', async () => {
		// Right after the answer, the chat keeps the answer in the place of the result.
		const call = ref(toolCall({ result: TURN_ON }));
		const { getByTestId } = renderAnswered(TURN_ON, { call });
		const status = getByTestId('automation-proposal-resolved-status');
		const iconOf = () => getByTestId('automation-proposal-resolved').querySelector('[data-icon]');

		expect(status).toHaveTextContent('Turning it on…');
		expect(getByTestId('automation-proposal-open-workflow')).toBeInTheDocument();
		// The waiting state holds the place of the icon, so the text does not move later.
		expect(iconOf()).toHaveAttribute('data-icon', 'loader-circle');
		expect(iconOf()?.closest('[aria-hidden="true"]')).not.toBeNull();
		expect(status.querySelector('[role="status"]')).toBeNull();

		call.value = toolCall({ result: { ...KEPT, active: true } });
		await nextTick();

		expect(status).toHaveTextContent(`It's on. "Morning digest" runs at 08:00`);
		expect(iconOf()).toHaveAttribute('data-icon', 'circle-check');
	});

	it('shows what the answer asked for when only a call of another tool has its id', () => {
		// A model can use a tool call id again, so the build call before the card can have its id.
		// AutomationProposalResolved.repeatedIds.test.ts reads the card's own call in a real chat.
		const call = ref(
			toolCall({ toolName: 'build-workflow', result: { workflowId: 'wf-1', saved: true } }),
		);
		const { getByTestId } = renderAnswered(TURN_ON, { call });

		expect(getByTestId('automation-proposal-resolved-status')).toHaveAttribute('data-status', 'on');
		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			`It's on. "Morning digest" runs at 08:00`,
		);
	});

	it('says that the workflow was saved but is off when the result is not active', async () => {
		const call = ref(toolCall({ result: TURN_ON }));
		const { getByTestId } = renderAnswered(TURN_ON, { call });

		call.value = toolCall({
			result: { ...KEPT, active: false, error: 'Saved "Morning digest", but could not turn it on' },
		});
		await nextTick();

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			"Saved, but it couldn't be turned on. Open the workflow to check it.",
		);
		expect(getByTestId('automation-proposal-open-workflow')).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
	});

	it.each([TURN_ON, SAVE])(
		'says "Not automated" like the tool step when an admin blocked it, without a link',
		(answer) => {
			const blocked = toolCall({ result: { denied: true, message: 'Blocked' } });
			const { getByTestId, queryByTestId } = renderAnswered(answer, { call: ref(blocked) });

			expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
				'Not automated. "Morning digest" couldn\'t be saved.',
			);
			expect(queryByTestId('automation-proposal-open-workflow')).not.toBeInTheDocument();
		},
	);

	it('asks the user to check the workflow when the call failed, because it may be kept', () => {
		const failed = toolCall({ error: 'Could not reach the database' });
		const { getByTestId } = renderAnswered(TURN_ON, { call: ref(failed) });

		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent(
			'Something went wrong with "Morning digest". Open the workflow to check it.',
		);
		expect(getByTestId('automation-proposal-open-workflow')).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
	});

	it('says that the changes are live after "Make changes live" on a live workflow', async () => {
		const proposal = makeProposal({ active: true, hasUnpublishedChanges: true });
		const call = ref(toolCall({ result: TURN_ON }));
		const { getByTestId } = renderAnswered(TURN_ON, { proposal, call });
		const status = getByTestId('automation-proposal-resolved-status');

		expect(status).toHaveTextContent('Making your changes live…');

		call.value = toolCall({ result: { ...KEPT, active: true } });
		await nextTick();

		expect(status).toHaveTextContent(
			'Your changes are live. "Morning digest" runs at 08:00, Monday through Friday (United Kingdom Time) on This computer.',
		);
	});

	it('announces the outcome politely, as one message', () => {
		const { getByTestId } = renderAnswered(TURN_ON, { call: ref(toolCall({ result: TURN_ON })) });
		const status = getByTestId('automation-proposal-resolved-status');

		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveAttribute('aria-atomic', 'true');
		expect(getByTestId('automation-proposal-resolved')).toHaveAccessibleName('Turning it on…');
	});

	it('keeps the open card for a value that is not an answer of the card', () => {
		const { getByTestId, queryByTestId } = renderAnswered({ ...KEPT, active: true });

		expect(getByTestId('automation-proposal-card')).toBeInTheDocument();
		expect(queryByTestId('automation-proposal-resolved')).not.toBeInTheDocument();
	});

	it('moves focus to the outcome when the user answers, because the buttons go away', async () => {
		const { getByTestId } = renderAnswered(undefined);

		await fireEvent.click(getByTestId('automation-proposal-turn-on'));

		expect(getByTestId('automation-proposal-resolved')).toHaveFocus();
	});

	it('leaves focus where it is for a card that was answered before it rendered', () => {
		const { getByTestId } = renderAnswered(SAVE);

		expect(getByTestId('automation-proposal-resolved')).not.toHaveFocus();
	});

	it('leaves focus where the user moved it when the chat takes a failed answer back', async () => {
		const state = ref<unknown>(undefined);
		const { getByTestId } = renderAnswered(undefined, { state });
		const elsewhere = document.body.appendChild(document.createElement('button'));

		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		elsewhere.focus();
		state.value = undefined;
		await nextTick();
		await nextTick();

		expect(getByTestId('automation-proposal-card')).toBeInTheDocument();
		expect(elsewhere).toHaveFocus();
		elsewhere.remove();
	});

	it('lets the user answer again when the chat takes a failed answer back', async () => {
		const state = ref<unknown>(undefined);
		const { getByTestId, queryByTestId } = renderAnswered(undefined, { state });

		await fireEvent.click(getByTestId('automation-proposal-turn-on'));
		expect(getByTestId('automation-proposal-resolved')).toBeInTheDocument();

		state.value = undefined;
		await nextTick();

		expect(queryByTestId('automation-proposal-resolved')).not.toBeInTheDocument();
		// The outcome had focus. Focus moves to the card, not to the page.
		await waitFor(() => expect(getByTestId('automation-proposal-card')).toHaveFocus());
		for (const testId of [
			'automation-proposal-turn-on',
			'automation-proposal-save',
			'automation-proposal-not-now',
		]) {
			expect(getByTestId(testId)).toBeEnabled();
		}

		await fireEvent.click(getByTestId('automation-proposal-not-now'));

		expect(state.value).toEqual(DECLINE);
		expect(getByTestId('automation-proposal-resolved-status')).toHaveTextContent('Not automated.');
		expect(getByTestId('automation-proposal-resolved')).toHaveFocus();
	});
});
