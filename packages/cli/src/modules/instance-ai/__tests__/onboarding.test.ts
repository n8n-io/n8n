import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { InstanceAiPendingConfirmation } from '../entities/instance-ai-pending-confirmation.entity';
import type { DurableEventLog } from '../event-bus/durable-event-log';
import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiOnboardingService } from '../onboarding';
import type { InstanceAiPendingConfirmationRepository } from '../repositories/instance-ai-pending-confirmation.repository';

const user = mock<User>({ id: 'user-1', firstName: 'Ada' });
const THREAD_ID = 'thread-1';
const CARD_REQUEST_ID = 'onboarding-card';
const urlSurvey = { survey: { what_team_are_you_on: 'Marketing' }, surveySource: 'url' };

function setup(sourceContext?: Record<string, unknown>) {
	const memoryService = mock<InstanceAiMemoryService>();
	const pendingConfirmationRepo = mock<InstanceAiPendingConfirmationRepository>();
	const telemetry = mock<Telemetry>();
	memoryService.ensureThread.mockResolvedValue({
		thread: {
			id: THREAD_ID,
			resourceId: user.id,
			createdAt: '2026-09-28T00:00:00.000Z',
			updatedAt: '2026-09-28T00:00:00.000Z',
		},
		created: true,
	});
	memoryService.seedOpeningMessages.mockResolvedValue({ userMessageId: 'msg-1' });
	memoryService.getThreadMetadata.mockResolvedValue({ source: 'onboarding', sourceContext });
	pendingConfirmationRepo.claim.mockResolvedValue(
		mock<InstanceAiPendingConfirmation>({
			threadId: THREAD_ID,
			runId: 'run-1',
			toolCallId: 'tc-1',
		}),
	);
	const service = new InstanceAiOnboardingService(
		memoryService,
		mock<InProcessEventBus>(),
		mock<DurableEventLog>(),
		pendingConfirmationRepo,
		telemetry,
	);
	return { service, telemetry };
}

describe('InstanceAiOnboardingService telemetry', () => {
	it('tracks the start with the team and where the team came from', async () => {
		const { service, telemetry } = setup();

		await service.ensureThread(user, THREAD_ID, 'project-1', {
			source: 'onboarding',
			origin: 'external',
			sourceContext: urlSurvey,
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_AI_ASSISTANT_ONBOARDING,
			{ user_id: user.id, thread_id: THREAD_ID, team: 'Marketing', team_source: 'url' },
		);
	});

	it('tracks the card answers with the card as the team source', async () => {
		const { service, telemetry } = setup();

		await service.answerCard(user.id, CARD_REQUEST_ID, {
			kind: 'questions',
			answers: [
				{ questionId: 'team', selectedOptions: ['Sales'] },
				{ questionId: 'apps', selectedOptions: ['Gmail', 'Slack'] },
			],
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD,
			{
				user_id: user.id,
				thread_id: THREAD_ID,
				team: 'Sales',
				team_source: 'card',
				apps: ['Gmail', 'Slack'],
				custom_text: null,
			},
		);
	});

	it('keeps the survey as the team source when the survey answered the team step', async () => {
		const { service, telemetry } = setup(urlSurvey);

		await service.answerCard(user.id, CARD_REQUEST_ID, {
			kind: 'questions',
			answers: [{ questionId: 'apps', selectedOptions: ['Gmail'] }],
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD,
			expect.objectContaining({ team: 'Marketing', team_source: 'url', apps: ['Gmail'] }),
		);
	});
});
