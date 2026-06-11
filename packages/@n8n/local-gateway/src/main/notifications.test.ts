const { notifications } = vi.hoisted(() => ({
	notifications: {
		isSupported: true,
		instances: [] as Array<{
			options: { title: string; body: string };
			show: ReturnType<typeof vi.fn>;
			handlers: Map<string, () => void>;
		}>,
	},
}));

vi.mock('electron', () => ({
	['Notification']: class {
		static isSupported = () => notifications.isSupported;
		private readonly handlers = new Map<string, () => void>();
		constructor(options: { title: string; body: string }) {
			notifications.instances.push({ options, show: this.show, handlers: this.handlers });
		}
		show = vi.fn();
		on(event: string, handler: () => void) {
			this.handlers.set(event, handler);
		}
	},
}));

import type { InstanceAiConfirmationRequestPayload } from '@n8n/api-types';

import { createPromptNotifier } from './notifications';
import type { LocalPermissionPromptRequest } from '../shared/types';

const LOCAL_PROMPT: LocalPermissionPromptRequest = {
	id: 'prompt-1',
	resource: {
		toolGroup: 'filesystemWrite',
		resource: '/tmp/ok.txt',
		description: 'Write file /tmp/ok.txt',
	},
	options: ['denyOnce', 'allowOnce', 'allowForSession'],
};

const CONFIRMATION: InstanceAiConfirmationRequestPayload = {
	requestId: 'req-1',
	toolCallId: 'tool-1',
	toolName: 'write_file',
	args: {},
	severity: 'warning',
	message: 'Allow writing to /tmp/ok.txt?',
};

describe('createPromptNotifier', () => {
	beforeEach(() => {
		notifications.isSupported = true;
		notifications.instances = [];
	});

	function createNotifier({ visible = false } = {}) {
		const showWindow = vi.fn();
		const notifier = createPromptNotifier({ isWindowVisible: () => visible, showWindow });
		return { notifier, showWindow };
	}

	it('shows a notification for a local prompt while the window is hidden', () => {
		const { notifier, showWindow } = createNotifier();
		notifier.notifyLocalPrompt(LOCAL_PROMPT);

		expect(notifications.instances).toHaveLength(1);
		const instance = notifications.instances[0];
		expect(instance.options.body).toBe('Write file /tmp/ok.txt');
		expect(instance.show).toHaveBeenCalled();

		instance.handlers.get('click')?.();
		expect(showWindow).toHaveBeenCalled();
	});

	it('does nothing while the window is visible', () => {
		const { notifier } = createNotifier({ visible: true });
		notifier.notifyLocalPrompt(LOCAL_PROMPT);
		notifier.notifyConfirmationRequest(CONFIRMATION);
		expect(notifications.instances).toHaveLength(0);
	});

	it('does nothing when notifications are unsupported', () => {
		notifications.isSupported = false;
		const { notifier } = createNotifier();
		notifier.notifyLocalPrompt(LOCAL_PROMPT);
		expect(notifications.instances).toHaveLength(0);
	});

	it('notifies each confirmation requestId only once (SSE replays)', () => {
		const { notifier } = createNotifier();
		notifier.notifyConfirmationRequest(CONFIRMATION);
		notifier.notifyConfirmationRequest(CONFIRMATION);

		expect(notifications.instances).toHaveLength(1);
		expect(notifications.instances[0].options.body).toBe('Allow writing to /tmp/ok.txt?');
	});

	it('skips non-displayable confirmations', () => {
		const { notifier } = createNotifier();
		notifier.notifyConfirmationRequest({ ...CONFIRMATION, requestId: 'req-2', message: '' });
		expect(notifications.instances).toHaveLength(0);
	});
});
