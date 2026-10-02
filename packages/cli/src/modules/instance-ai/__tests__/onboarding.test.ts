import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';
import type { Telemetry } from '@/telemetry';

import type { InstanceAiPendingConfirmation } from '../entities/instance-ai-pending-confirmation.entity';
import type { DurableEventLog } from '../event-bus/durable-event-log';
import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiOnboardingService, startsOnboardingFirstTurn } from '../onboarding';
import { ONBOARDING_OPENING } from '../onboarding-opening';
import type { InstanceAiPendingConfirmationRepository } from '../repositories/instance-ai-pending-confirmation.repository';

const user = mock<User>({ id: 'user-1', firstName: 'Ada' });
const THREAD_ID = 'thread-1';
const CARD_REQUEST_ID = 'onboarding-card';
const urlSurvey = { survey: { what_team_are_you_on: 'Marketing' }, surveySource: 'url' };

function setup(sourceContext?: Record<string, unknown>) {
	const memoryService = mock<InstanceAiMemoryService>();
	const pendingConfirmationRepo = mock<InstanceAiPendingConfirmationRepository>();
	const telemetry = mock<Telemetry>();
	const eventBus = mock<InProcessEventBus>();
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
		eventBus,
		mock<DurableEventLog>(),
		pendingConfirmationRepo,
		telemetry,
	);
	return { service, telemetry, memoryService, pendingConfirmationRepo, eventBus };
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

const freeTextAnswer: InstanceAiConfirmRequest = {
	kind: 'questions',
	answers: [{ questionId: 'apps', selectedOptions: [], customText: 'i just want to import a csv' }],
};
const approval: InstanceAiConfirmRequest = { kind: 'approval', approved: true };

describe('InstanceAiOnboardingService answerCard', () => {
	it('refuses an answer of another kind before the card is claimed', async () => {
		const { service, pendingConfirmationRepo, eventBus } = setup();

		await expect(service.answerCard(user.id, CARD_REQUEST_ID, approval)).rejects.toThrow(
			BadRequestError,
		);
		expect(pendingConfirmationRepo.claim).not.toHaveBeenCalled();
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('hands free text back as the first message and posts no follow-up', async () => {
		const { service, memoryService } = setup();

		const card = await service.answerCard(user.id, CARD_REQUEST_ID, freeTextAnswer);

		expect(card).toEqual({
			threadId: THREAD_ID,
			firstMessage: expect.stringContaining('typed "i just want to import a csv"'),
		});
		expect(memoryService.seedOpeningMessages).not.toHaveBeenCalled();
	});

	it('posts the follow-up as a finished run when the card holds no free text', async () => {
		const { service, memoryService } = setup();

		const card = await service.answerCard(user.id, CARD_REQUEST_ID, {
			kind: 'questions',
			answers: [{ questionId: 'apps', selectedOptions: ['Gmail', 'Slack'] }],
		});

		expect(card).toEqual({ threadId: THREAD_ID, runId: expect.any(String) });
		expect(memoryService.seedOpeningMessages).toHaveBeenCalledWith(
			THREAD_ID,
			user.id,
			'Last one: what do you usually do in Gmail and Slack?',
			expect.stringContaining('<onboarding-answer>'),
		);
	});
});

describe('startsOnboardingFirstTurn', () => {
	it.each<[boolean, string, string, InstanceAiConfirmRequest]>([
		[true, 'free text on the onboarding card', CARD_REQUEST_ID, freeTextAnswer],
		[
			false,
			'blank free text on the onboarding card',
			CARD_REQUEST_ID,
			{
				kind: 'questions',
				answers: [{ questionId: 'apps', selectedOptions: ['Gmail'], customText: ' ' }],
			},
		],
		[false, 'an answer of another kind on the onboarding card', CARD_REQUEST_ID, approval],
		[false, 'free text on another card', 'req-1', freeTextAnswer],
	])('returns %s for %s', (expected, _label, requestId, request) => {
		expect(startsOnboardingFirstTurn(requestId, request)).toBe(expected);
	});
});

describe('ONBOARDING_OPENING apps step', () => {
	const team = ONBOARDING_OPENING.questions.find((question) => question.id === 'team');
	const apps = ONBOARDING_OPENING.questions.find((question) => question.id === 'apps');
	const universal = ['Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'];

	it('lists 7 apps for an unknown team', () => {
		expect(apps?.options).toHaveLength(7);
	});

	it('lists 3 team tools and then the 4 universal apps for every team', () => {
		const byTeam = apps?.optionsByAnswer?.options ?? {};
		expect(Object.keys(byTeam).sort()).toEqual([...(team?.options ?? [])].sort());
		for (const options of Object.values(byTeam)) {
			expect(options).toHaveLength(7);
			expect(new Set(options).size).toBe(7);
			expect(options.slice(3)).toEqual(universal);
		}
	});
});
