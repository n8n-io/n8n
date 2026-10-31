import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { EMPTY_ASSISTANT_MENTION_COUNTS } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import { resolveAuthorship, USER_TYPED_MESSAGE } from '../../prefills';
import { useAssistantAgentMessageTelemetry } from '../useAssistantAgentMessageTelemetry';

const { telemetryTrack } = vi.hoisted(() => ({ telemetryTrack: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const EVENT = TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE;

function sending(text: string, extra: { isFirstMessage?: boolean; files?: File[] } = {}) {
	return {
		text,
		files: extra.files ?? [],
		clientContext: { attachments: [{ type: 'agent', id: 'agent-1', projectId: 'p1' }] },
		isFirstMessage: extra.isFirstMessage ?? false,
	};
}

describe('useAssistantAgentMessageTelemetry', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useRootStore().setInstanceId('instance-1');
		telemetryTrack.mockReset();
	});

	it('reports a typed message with the properties of the current runtime', () => {
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');

		telemetry.trackSend(
			sending('Add a Slack tool', { isFirstMessage: true, files: [new File(['a'], 'a.png')] }),
		);

		expect(telemetryTrack).toHaveBeenCalledWith(EVENT, {
			thread_id: 'thread-1',
			instance_id: 'instance-1',
			is_first_message: true,
			action_source: 'unknown',
			prefill_type: null,
			prefill_id: null,
			prompt_modified: null,
			mention_counts: EMPTY_ASSISTANT_MENTION_COUNTS,
			attachment_count: 2,
			runtime: 'agents',
		});
	});

	it('reports a pre-fill, and whether the user edited it, until a send is accepted', () => {
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');
		telemetry.setPrefill({
			text: 'Fix the reply tone',
			prefillType: 'handoff_agent_change_request',
		});

		telemetry.trackSend(sending('Fix the reply tone'));
		telemetry.trackSend(sending('Fix the reply tone, please'));
		telemetry.onMessageAccepted();
		telemetry.trackSend(sending('Thanks'));

		expect(telemetryTrack.mock.calls.map(([, props]) => props)).toMatchObject([
			{ prefill_type: 'handoff_agent_change_request', prompt_modified: false },
			{ prefill_type: 'handoff_agent_change_request', prompt_modified: true },
			{ prefill_type: null, prompt_modified: null },
		]);
	});

	it('reports the authorship and mentions of a host send once', () => {
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');
		const mentionCounts = { ...EMPTY_ASSISTANT_MENTION_COUNTS, workflow: 1, total: 1 };
		telemetry.expectHostSend({
			text: 'Build a digest ',
			authorship: { kind: 'prefill', prefillType: 'suggestion_catalog', prefillId: 's-1' },
			mentionCounts,
		});

		telemetry.trackSend(sending('Build a digest'));
		telemetry.trackSend(sending('Build a digest'));

		expect(telemetryTrack.mock.calls.map(([, props]) => props)).toMatchObject([
			{
				prefill_type: 'suggestion_catalog',
				prefill_id: 's-1',
				prompt_modified: false,
				mention_counts: mentionCounts,
			},
			{ prefill_type: null, mention_counts: EMPTY_ASSISTANT_MENTION_COUNTS },
		]);
	});

	it('forgets a host send that the next send is not', () => {
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');
		telemetry.expectHostSend({
			text: 'Build a digest',
			authorship: { kind: 'prefill', prefillType: 'suggestion_catalog' },
		});

		telemetry.trackSend(sending('Something else'));
		telemetry.trackSend(sending('Build a digest'));

		expect(telemetryTrack.mock.calls.map(([, props]) => props)).toMatchObject([
			{ prefill_type: null },
			{ prefill_type: null },
		]);
	});

	it('reports an unchanged pre-fill whose text ends with white space as not edited', () => {
		const text = 'Build a digest\n';
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');
		telemetry.expectHostSend({
			text,
			authorship: resolveAuthorship(text, { text, prefillType: 'suggestion_catalog' }),
		});

		telemetry.trackSend(sending('Build a digest'));

		expect(telemetryTrack).toHaveBeenCalledWith(
			EVENT,
			expect.objectContaining({ prefill_type: 'suggestion_catalog', prompt_modified: false }),
		);
	});

	it('falls back to the composer pre-fill when the sent text is not the host text', () => {
		const telemetry = useAssistantAgentMessageTelemetry('thread-1');
		telemetry.expectHostSend({ text: 'Set up Slack', authorship: USER_TYPED_MESSAGE });
		telemetry.setPrefill({ text: 'Fix it', prefillType: 'handoff_agent_change_request' });

		telemetry.trackSend(sending('Something else'));

		expect(telemetryTrack).toHaveBeenCalledWith(
			EVENT,
			expect.objectContaining({
				prefill_type: 'handoff_agent_change_request',
				prompt_modified: true,
			}),
		);
	});
});
