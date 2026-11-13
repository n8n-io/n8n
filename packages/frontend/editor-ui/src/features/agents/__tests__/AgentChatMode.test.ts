import { configure, fireEvent, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentChatGoLiveOptions from '../components/chatMode/AgentChatGoLiveOptions.vue';
import AgentChatLiveGate from '../components/chatMode/AgentChatLiveGate.vue';
import AgentChatModeBadge from '../components/chatMode/AgentChatModeBadge.vue';
import AgentChatModeExplainer from '../components/chatMode/AgentChatModeExplainer.vue';
import AgentChatModeResetNotice from '../components/chatMode/AgentChatModeResetNotice.vue';
import AgentChatModeSwitch from '../components/chatMode/AgentChatModeSwitch.vue';
import AgentGoLiveConfirmModal from '../components/chatMode/AgentGoLiveConfirmModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

describe('AgentChatModeBadge', () => {
	const renderBadge = createComponentRenderer(AgentChatModeBadge);

	it('shows Test run in the header', () => {
		const { getByTestId } = renderBadge({ props: { mode: 'test' } });

		const badge = getByTestId('agent-chat-mode-badge');
		expect(badge).toHaveTextContent('Test run');
		expect(badge).toHaveAttribute('data-mode', 'test');
		expect(badge).toHaveAttribute('aria-label', 'Chat mode: Test run');
	});

	it('shows Live in the header', () => {
		const { getByTestId } = renderBadge({ props: { mode: 'live' } });

		const badge = getByTestId('agent-chat-mode-badge');
		expect(badge).toHaveTextContent('Live');
		expect(badge).toHaveAttribute('data-mode', 'live');
		expect(badge).toHaveAttribute('aria-label', 'Chat mode: Live');
	});

	it('never shows the go-live menu on a live chat', () => {
		const { getByTestId } = renderBadge({ props: { mode: 'live', showMenu: true } });

		expect(getByTestId('agent-chat-mode-badge').tagName).toBe('SPAN');
		expect(getByTestId('agent-chat-mode-badge')).not.toHaveAttribute('aria-haspopup');
	});

	it.each([
		['unpublished', 'Publish and go live'],
		['changed', 'Republish and go live'],
		['published', 'Go live'],
	] as const)('opens the %s go-live options from a test run', async (liveAvailability, heading) => {
		const { getByTestId } = renderBadge({
			props: { mode: 'test', showMenu: true, liveAvailability },
		});

		const trigger = getByTestId('agent-chat-mode-badge');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(trigger);

		await waitFor(() => expect(screen.getByTestId('agent-chat-mode-menu')).toBeInTheDocument());
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('agent-chat-go-live-heading')).toHaveTextContent(heading);
	});

	it('emits the go-live actions and closes the menu', async () => {
		const { getByTestId, emitted } = renderBadge({
			props: { mode: 'test', showMenu: true, liveAvailability: 'changed' },
		});

		await fireEvent.click(getByTestId('agent-chat-mode-badge'));
		await fireEvent.click(await screen.findByTestId('agent-chat-go-live-run-this-chat'));
		expect(emitted('run-this-chat')).toHaveLength(1);
		await waitFor(() =>
			expect(screen.queryByTestId('agent-chat-mode-menu')).not.toBeInTheDocument(),
		);

		await fireEvent.click(getByTestId('agent-chat-mode-badge'));
		await fireEvent.click(await screen.findByTestId('agent-chat-go-live-new-chat'));
		expect(emitted('new-live-chat')).toHaveLength(1);
	});

	it('puts caller content before the go-live options', async () => {
		const { getByTestId } = renderBadge({
			props: { mode: 'test', showMenu: true },
			slots: { 'menu-before': '<button data-testid="caller-new-test-run">New test run</button>' },
		});

		await fireEvent.click(getByTestId('agent-chat-mode-badge'));
		const menu = await screen.findByTestId('agent-chat-mode-menu');
		expect(menu.firstElementChild).toHaveAttribute('data-testid', 'caller-new-test-run');
	});
});

describe('AgentChatModeExplainer', () => {
	const renderExplainer = createComponentRenderer(AgentChatModeExplainer);

	it('explains a test run', () => {
		const { getByTestId } = renderExplainer({ props: { mode: 'test' } });

		expect(getByTestId('agent-chat-mode-explainer')).toHaveTextContent(
			'Test run. The agent reads your real apps. Anything it would send or change stays in this chat.',
		);
	});

	it('explains a live chat', () => {
		const { getByTestId } = renderExplainer({ props: { mode: 'live' } });

		expect(getByTestId('agent-chat-mode-explainer')).toHaveTextContent(
			'Live. This chat uses your published agent. Anything it sends is real.',
		);
	});

	it('emits dismiss from Got it', async () => {
		const { getByTestId, emitted } = renderExplainer({ props: { mode: 'test' } });

		const dismiss = getByTestId('agent-chat-mode-explainer-dismiss');
		expect(dismiss).toHaveTextContent('Got it');
		await fireEvent.click(dismiss);

		expect(emitted('dismiss')).toHaveLength(1);
	});
});

describe('AgentChatModeSwitch', () => {
	const renderSwitch = createComponentRenderer(AgentChatModeSwitch);

	it('marks Test run as selected', () => {
		const { getByRole } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published' },
		});

		expect(getByRole('radiogroup', { name: 'How this chat runs' })).toBeInTheDocument();
		expect(getByRole('radio', { name: 'Test run' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('radio', { name: 'Live' })).toHaveAttribute('aria-checked', 'false');
	});

	it('marks Live as selected', () => {
		const { getByRole } = renderSwitch({
			props: { modelValue: 'live', liveAvailability: 'published' },
		});

		expect(getByRole('radio', { name: 'Live' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('radio', { name: 'Test run' })).toHaveAttribute('aria-checked', 'false');
	});

	it('is one Tab stop and changes mode with the arrow keys', async () => {
		const { getByTestId, emitted, rerender } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published' },
		});

		expect(getByTestId('agent-chat-mode-switch-test')).toHaveAttribute('tabindex', '0');
		expect(getByTestId('agent-chat-mode-switch-live')).toHaveAttribute('tabindex', '-1');

		await fireEvent.keyDown(getByTestId('agent-chat-mode-switch-test'), { key: 'ArrowRight' });
		expect(emitted('update:modelValue')).toEqual([['live']]);
		await waitFor(() => expect(getByTestId('agent-chat-mode-switch-live')).toHaveFocus());

		await rerender({ modelValue: 'live', liveAvailability: 'published' });
		expect(getByTestId('agent-chat-mode-switch-live')).toHaveAttribute('tabindex', '0');
		await fireEvent.keyDown(getByTestId('agent-chat-mode-switch-live'), { key: 'ArrowUp' });
		expect(emitted('update:modelValue')).toEqual([['live'], ['test']]);
		await waitFor(() => expect(getByTestId('agent-chat-mode-switch-test')).toHaveFocus());
	});

	it('ignores arrow keys once the mode is locked', async () => {
		const { getByTestId, emitted } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published', disabled: true },
		});

		await fireEvent.keyDown(getByTestId('agent-chat-mode-switch'), { key: 'ArrowRight' });
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('switches from Test run to Live and back', async () => {
		const { getByTestId, emitted, rerender } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published' },
		});

		await fireEvent.click(getByTestId('agent-chat-mode-switch-live'));
		expect(emitted('update:modelValue')).toEqual([['live']]);

		await rerender({ modelValue: 'live', liveAvailability: 'published' });
		await fireEvent.click(getByTestId('agent-chat-mode-switch-test'));
		expect(emitted('update:modelValue')).toEqual([['live'], ['test']]);
	});

	it('does not emit when the selected mode is clicked again', async () => {
		const { getByTestId, emitted } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published' },
		});

		await fireEvent.click(getByTestId('agent-chat-mode-switch-test'));

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('lets the user pick Live before a publish, so the gate can explain it', async () => {
		const { getByTestId, emitted } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'unpublished' },
		});

		await fireEvent.click(getByTestId('agent-chat-mode-switch-live'));

		expect(emitted('update:modelValue')).toEqual([['live']]);
	});

	it('locks the mode after the first message', async () => {
		const { getByTestId, emitted } = renderSwitch({
			props: { modelValue: 'test', liveAvailability: 'published', disabled: true },
		});

		expect(getByTestId('agent-chat-mode-switch-live')).toBeDisabled();
		expect(getByTestId('agent-chat-mode-switch-test')).toBeDisabled();
		await fireEvent.click(getByTestId('agent-chat-mode-switch-live'));

		expect(emitted('update:modelValue')).toBeUndefined();
	});
});

describe('AgentChatGoLiveOptions', () => {
	const renderOptions = createComponentRenderer(AgentChatGoLiveOptions);

	it('hides Run this chat before the first message', () => {
		const { queryByTestId, getByTestId } = renderOptions({
			props: { liveAvailability: 'published', canRunThisChat: false },
		});

		expect(queryByTestId('agent-chat-go-live-run-this-chat')).not.toBeInTheDocument();
		expect(getByTestId('agent-chat-go-live-new-chat')).toHaveTextContent(
			'New live chatStarts an empty live chat',
		);
	});

	it('describes Run this chat', () => {
		const { getByTestId } = renderOptions({ props: { liveAvailability: 'published' } });

		expect(getByTestId('agent-chat-go-live-run-this-chat')).toHaveTextContent(
			'Run this chatSends your first message again, for real',
		);
	});

	it('disables both actions without permission', async () => {
		const { getByTestId, emitted } = renderOptions({
			props: { liveAvailability: 'unpublished', disabled: true },
		});

		expect(getByTestId('agent-chat-go-live-run-this-chat')).toBeDisabled();
		expect(getByTestId('agent-chat-go-live-new-chat')).toBeDisabled();
		await fireEvent.click(getByTestId('agent-chat-go-live-new-chat'));
		expect(emitted('new-chat')).toBeUndefined();
	});
});

describe('AgentChatLiveGate', () => {
	const renderGate = createComponentRenderer(AgentChatLiveGate);

	it('asks for a publish when the agent is not published', async () => {
		const { getByTestId, queryByTestId, emitted } = renderGate({
			props: { reason: 'unpublished' },
		});

		expect(getByTestId('agent-chat-live-gate')).toHaveTextContent(
			'Live uses the published agent. Publish it to chat live.',
		);
		expect(queryByTestId('agent-chat-live-gate-use-live-version')).not.toBeInTheDocument();
		const publish = getByTestId('agent-chat-live-gate-publish');
		expect(publish).toHaveTextContent('Publish to use live');

		await fireEvent.click(publish);
		expect(emitted('publish')).toHaveLength(1);
	});

	it('offers a republish or the live version when the draft changed', async () => {
		const { getByTestId, emitted } = renderGate({ props: { reason: 'changed' } });

		expect(getByTestId('agent-chat-live-gate')).toHaveTextContent(
			'Live uses the published version, without your latest changes.',
		);
		expect(getByTestId('agent-chat-live-gate-publish')).toHaveTextContent(
			'Republish to use changes live',
		);

		await fireEvent.click(getByTestId('agent-chat-live-gate-use-live-version'));
		expect(emitted('use-live-version')).toHaveLength(1);
		await fireEvent.click(getByTestId('agent-chat-live-gate-publish'));
		expect(emitted('publish')).toHaveLength(1);
	});

	it('hides the publish action without permission', () => {
		const { queryByTestId, getByTestId } = renderGate({
			props: { reason: 'changed', canPublish: false },
		});

		expect(queryByTestId('agent-chat-live-gate-publish')).not.toBeInTheDocument();
		expect(getByTestId('agent-chat-live-gate-use-live-version')).toBeInTheDocument();
	});

	it('blocks Use live version while publishing', () => {
		const { getByTestId } = renderGate({ props: { reason: 'changed', busy: true } });

		expect(getByTestId('agent-chat-live-gate-use-live-version')).toBeDisabled();
	});
});

describe('AgentGoLiveConfirmModal', () => {
	const renderModal = createComponentRenderer(AgentGoLiveConfirmModal, {
		global: { stubs: { AgentModal: AgentModalTestStub } },
	});

	const sendTargets = [
		{ id: 'slack', label: 'Slack message in #support' },
		{ id: 'gmail', label: 'Email to customer', detail: 'sam@example.com' },
	];

	it('lists what might really get sent', () => {
		const { getByRole, getByTestId, queryByTestId } = renderModal({
			props: {
				open: true,
				action: 'run-this-chat',
				liveAvailability: 'published',
				sendTargets,
			},
		});

		const dialog = getByRole('dialog');
		expect(dialog).toHaveTextContent('Run this chat live?');
		expect(dialog).toHaveTextContent('Starts a new live chat with your first message.');
		expect(getByTestId('agent-go-live-confirm-list-label')).toHaveTextContent(
			'These might get sent for real:',
		);
		const items = getByTestId('agent-go-live-confirm-list').querySelectorAll('li');
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent('Slack message in #support');
		expect(items[1]).toHaveTextContent('Email to customer');
		expect(items[1]).toHaveTextContent('sam@example.com');
		expect(queryByTestId('agent-go-live-confirm-no-list')).not.toBeInTheDocument();
		expect(getByTestId('agent-go-live-confirm')).toHaveTextContent('Run live');
	});

	it('says everything is real when nothing is known', () => {
		const { getByTestId, queryByTestId } = renderModal({
			props: { open: true, action: 'run-this-chat', liveAvailability: 'published' },
		});

		expect(queryByTestId('agent-go-live-confirm-list')).not.toBeInTheDocument();
		expect(getByTestId('agent-go-live-confirm-no-list')).toHaveTextContent(
			'Anything the agent sends will be real.',
		);
	});

	it.each([
		['run-this-chat', 'published', 'Run this chat live?', 'Run live'],
		['run-this-chat', 'unpublished', 'Publish, then run live?', 'Publish and run'],
		['run-this-chat', 'changed', 'Republish, then run live?', 'Republish and run'],
		['new-chat', 'published', 'Start a live chat?', 'Go live'],
		['new-chat', 'unpublished', 'Publish, then start a live chat?', 'Publish and go live'],
		['new-chat', 'changed', 'Republish, then start a live chat?', 'Republish and go live'],
	] as const)(
		'uses the %s copy when the agent is %s',
		(action, liveAvailability, title, confirm) => {
			const { getByRole, getByTestId } = renderModal({
				props: { open: true, action, liveAvailability, sendTargets },
			});

			expect(getByRole('dialog')).toHaveTextContent(title);
			expect(getByTestId('agent-go-live-confirm')).toHaveTextContent(confirm);
		},
	);

	it('describes a new live chat', () => {
		const { getByRole } = renderModal({
			props: { open: true, action: 'new-chat', liveAvailability: 'published' },
		});

		expect(getByRole('dialog')).toHaveTextContent(
			'Starts an empty live chat with your published agent.',
		);
	});

	it('emits confirm', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, action: 'run-this-chat', liveAvailability: 'changed', sendTargets },
		});

		await fireEvent.click(getByTestId('agent-go-live-confirm'));

		expect(emitted('confirm')).toHaveLength(1);
		expect(emitted('cancel')).toBeUndefined();
	});

	it('emits cancel from Cancel and from Close', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, action: 'run-this-chat', liveAvailability: 'published' },
		});

		await fireEvent.click(getByTestId('agent-modal-cancel'));
		await fireEvent.click(getByTestId('dialog-close-button'));

		expect(emitted('cancel')).toHaveLength(2);
		expect(emitted('update:open')).toEqual([[false], [false]]);
		expect(emitted('confirm')).toBeUndefined();
	});

	it('cannot be dismissed while busy', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, action: 'run-this-chat', liveAvailability: 'published', busy: true },
		});

		await fireEvent.click(getByTestId('dialog-close-button'));
		await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

		expect(emitted('cancel')).toBeUndefined();
		expect(emitted('update:open')).toBeUndefined();
	});

	it('ignores a second confirm while busy', async () => {
		const { getByTestId, emitted } = renderModal({
			props: { open: true, action: 'new-chat', liveAvailability: 'unpublished', busy: true },
		});

		await fireEvent.click(getByTestId('agent-go-live-confirm'));

		expect(emitted('confirm')).toBeUndefined();
	});

	it('renders nothing when closed', () => {
		const { queryByRole } = renderModal({
			props: { open: false, action: 'new-chat', liveAvailability: 'published' },
		});

		expect(queryByRole('dialog')).not.toBeInTheDocument();
	});
});

describe('AgentChatModeResetNotice', () => {
	const renderNotice = createComponentRenderer(AgentChatModeResetNotice);

	it('says the chat is back in a test run', () => {
		const { getByRole } = renderNotice();

		expect(getByRole('status')).toHaveTextContent('Agent changed. New chat in Test run.');
	});
});
