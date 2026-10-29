import type { InstanceAiConfirmRequest, InstanceAiEvent } from '@n8n/api-types';
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
import {
	InstanceAiOnboardingService,
	preloadsSuggestAutomations,
	startsOnboardingFirstTurn,
} from '../onboarding';
import { BUILD_OPTIONS, INTENT_OPTIONS, ONBOARDING_OPENING } from '../onboarding-opening';
import type { InstanceAiPendingConfirmationRepository } from '../repositories/instance-ai-pending-confirmation.repository';

const user = mock<User>({ id: 'user-1', firstName: 'Ada' });
const THREAD_ID = 'thread-1';
const INTENT_CARD_ID = 'onboarding-intent~abc';
const BUILD_CARD_ID = 'onboarding-build~abc';
const IDEA_CARD_ID = 'onboarding-idea~abc';
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

/** The card the service seeded last: the payload of its `confirmation-request` event. */
function seededCard(eventBus: ReturnType<typeof setup>['eventBus']) {
	const requests = eventBus.publish.mock.calls
		.map(([, event]) => event as InstanceAiEvent)
		.filter((event) => event.type === 'confirmation-request');
	const last = requests.at(-1);
	return last?.type === 'confirmation-request' ? last.payload : undefined;
}

const pick = (questionId: string, option: string): InstanceAiConfirmRequest => ({
	kind: 'questions',
	answers: [{ questionId, selectedOptions: [option] }],
});
const ideaAnswers: InstanceAiConfirmRequest = {
	kind: 'questions',
	answers: [
		{ questionId: 'team', selectedOptions: ['Sales'] },
		{ questionId: 'apps', selectedOptions: ['HubSpot', 'Gmail'] },
		{ questionId: 'goal', selectedOptions: ['Create reports automatically'] },
	],
};
const approval: InstanceAiConfirmRequest = { kind: 'approval', approved: true };

describe('InstanceAiOnboardingService ensureThread', () => {
	it('opens with the greeting and the intent card', async () => {
		const { service, eventBus, memoryService } = setup();

		await service.ensureThread(user, THREAD_ID, 'project-1', {
			source: 'onboarding',
			origin: 'external',
		});

		expect(memoryService.seedOpeningMessages).toHaveBeenCalledWith(
			THREAD_ID,
			user.id,
			expect.stringContaining('Hi Ada'),
		);
		const card = seededCard(eventBus);
		expect(card?.questions).toEqual([ONBOARDING_OPENING.intent]);
		expect(card?.requestId).toMatch(/^onboarding-intent~/);
		expect(card?.requestId).toHaveLength(36);
	});

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
});

describe('InstanceAiOnboardingService answerCard', () => {
	it('refuses an answer of another kind before the card is claimed', async () => {
		const { service, pendingConfirmationRepo, eventBus } = setup();

		await expect(service.answerCard(user.id, INTENT_CARD_ID, approval)).rejects.toThrow(
			BadRequestError,
		);
		expect(pendingConfirmationRepo.claim).not.toHaveBeenCalled();
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('leaves a request id that names no card to the HITL path', async () => {
		const { service, pendingConfirmationRepo } = setup();

		const result = await service.answerCard(user.id, 'onboarding-V1StGXR8Z5jdHi6BmyT', ideaAnswers);

		expect(result).toBeUndefined();
		expect(pendingConfirmationRepo.claim).not.toHaveBeenCalled();
	});

	it('stores the build route and seeds the build card', async () => {
		const { service, memoryService, eventBus, telemetry } = setup();

		const result = await service.answerCard(
			user.id,
			INTENT_CARD_ID,
			pick('intent', INTENT_OPTIONS.build),
		);

		expect(result).toEqual({ threadId: THREAD_ID, runId: expect.any(String) });
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'build' },
		});
		const card = seededCard(eventBus);
		expect(card?.questions).toEqual([ONBOARDING_OPENING.build.question]);
		expect(card?.requestId).toMatch(/^onboarding-build~/);
		expect(memoryService.seedOpeningMessages).toHaveBeenCalledWith(
			THREAD_ID,
			user.id,
			ONBOARDING_OPENING.build.lead,
			expect.stringContaining(INTENT_OPTIONS.build),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_PICKED_AI_ASSISTANT_ONBOARDING_OPTION,
			{ user_id: user.id, thread_id: THREAD_ID, card: 'intent', route: 'build', custom_text: null },
		);
	});

	it('seeds the idea card with the team, apps and goal steps', async () => {
		const { service, eventBus } = setup();

		await service.answerCard(user.id, INTENT_CARD_ID, pick('intent', INTENT_OPTIONS.idea));

		const card = seededCard(eventBus);
		expect(card?.questions?.map((question) => question.id)).toEqual(['team', 'apps', 'goal']);
		expect(card?.requestId).toMatch(/^onboarding-idea~/);
	});

	it('skips the team step of the idea card when the survey answered it', async () => {
		const { service, eventBus } = setup(urlSurvey);

		await service.answerCard(user.id, INTENT_CARD_ID, pick('intent', INTENT_OPTIONS.idea));

		const card = seededCard(eventBus);
		expect(card?.questions?.map((question) => question.id)).toEqual(['apps', 'goal']);
		expect(card?.questions?.[0].options).toContain('Facebook');
	});

	it('starts the first turn from free text in the intent card', async () => {
		const { service, memoryService, telemetry } = setup();

		const result = await service.answerCard(user.id, INTENT_CARD_ID, {
			kind: 'questions',
			answers: [{ questionId: 'intent', selectedOptions: [], customText: 'sync my leads' }],
		});

		expect(result).toEqual({
			threadId: THREAD_ID,
			firstMessage: expect.stringContaining('typed "sync my leads"'),
		});
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'other' },
		});
		expect(memoryService.seedOpeningMessages).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_PICKED_AI_ASSISTANT_ONBOARDING_OPTION,
			expect.objectContaining({ route: 'other', custom_text: 'sync my leads' }),
		);
	});

	it('posts the AI follow-up with no card when the user builds with AI', async () => {
		const { service, memoryService, pendingConfirmationRepo } = setup();

		const result = await service.answerCard(
			user.id,
			BUILD_CARD_ID,
			pick('build', BUILD_OPTIONS.ai),
		);

		expect(result).toEqual({ threadId: THREAD_ID, runId: expect.any(String) });
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'build_ai' },
		});
		expect(memoryService.seedOpeningMessages).toHaveBeenCalledWith(
			THREAD_ID,
			user.id,
			ONBOARDING_OPENING.build.aiFollowUp,
			expect.any(String),
		);
		expect(pendingConfirmationRepo.save).not.toHaveBeenCalled();
	});

	it('starts the build turn from free text in the build card', async () => {
		const { service, memoryService } = setup();

		const result = await service.answerCard(user.id, BUILD_CARD_ID, {
			kind: 'questions',
			answers: [{ questionId: 'build', selectedOptions: [], customText: 'a lead tracker' }],
		});

		expect(result).toEqual({
			threadId: THREAD_ID,
			firstMessage: expect.stringContaining('typed "a lead tracker"'),
		});
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'build_ai' },
		});
	});

	it('ends the onboarding and sends the user to a blank canvas when they build it themselves', async () => {
		const { service, memoryService } = setup();

		const result = await service.answerCard(
			user.id,
			BUILD_CARD_ID,
			pick('build', BUILD_OPTIONS.canvas),
		);

		expect(result).toEqual({
			threadId: THREAD_ID,
			runId: expect.any(String),
			navigateTo: 'new-workflow',
		});
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'build_canvas', onboardingLeft: true },
		});
		expect(memoryService.seedOpeningMessages).toHaveBeenCalledWith(
			THREAD_ID,
			user.id,
			ONBOARDING_OPENING.build.canvasMessage,
			expect.any(String),
		);
	});

	it('starts the first turn from the idea card answers', async () => {
		const { service, memoryService } = setup();

		const result = await service.answerCard(user.id, IDEA_CARD_ID, ideaAnswers);

		expect(result).toEqual({
			threadId: THREAD_ID,
			firstMessage: expect.stringContaining(
				'What do you want to automate first? Create reports automatically',
			),
		});
		expect(memoryService.seedOpeningMessages).not.toHaveBeenCalled();
	});

	it('tracks the idea card answers with the card as the team source', async () => {
		const { service, telemetry } = setup();

		await service.answerCard(user.id, IDEA_CARD_ID, ideaAnswers);

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD,
			{
				user_id: user.id,
				thread_id: THREAD_ID,
				team: 'Sales',
				team_source: 'card',
				apps: ['HubSpot', 'Gmail'],
				goal: 'Create reports automatically',
				custom_text: null,
			},
		);
	});

	it('keeps the survey as the team source when the survey answered the team step', async () => {
		const { service, telemetry } = setup(urlSurvey);

		await service.answerCard(user.id, IDEA_CARD_ID, {
			kind: 'questions',
			answers: [
				{ questionId: 'apps', selectedOptions: ['Gmail'] },
				{ questionId: 'goal', selectedOptions: ['Reply to people faster'] },
			],
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_ANSWERED_AI_ASSISTANT_ONBOARDING_CARD,
			expect.objectContaining({ team: 'Marketing', team_source: 'url', apps: ['Gmail'] }),
		);
	});
});

describe('ONBOARDING_OPENING routing cards', () => {
	it.each([
		['intent', ONBOARDING_OPENING.intent],
		['build', ONBOARDING_OPENING.build.question],
	])('the %s card hides free text and gives every option a description', (_card, question) => {
		expect(question.freeText).toBe(false);
		for (const option of question.options ?? []) {
			expect(option.split('\n')).toHaveLength(2);
		}
	});

	it('routes a pick that carries the option description', async () => {
		const { service, memoryService } = setup();
		const [buildOption] = ONBOARDING_OPENING.intent.options ?? [];

		await service.answerCard(user.id, INTENT_CARD_ID, pick('intent', buildOption));

		expect(buildOption).toContain('\n');
		expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
			metadata: { onboardingRoute: 'build' },
		});
	});
});

describe('InstanceAiOnboardingService seeded runs and answers', () => {
	it('marks every seeded run as host-written', async () => {
		const { service, eventBus } = setup();

		await service.ensureThread(user, THREAD_ID, 'project-1', {
			source: 'onboarding',
			origin: 'external',
		});

		const runStart = eventBus.publish.mock.calls
			.map(([, event]) => event as InstanceAiEvent)
			.find((event) => event.type === 'run-start');
		expect(runStart?.type === 'run-start' && runStart.payload.hostSeeded).toBe(true);
	});

	it('keeps only the option title in the card record and the agent message', async () => {
		const { service, eventBus, memoryService } = setup();
		const [buildOption] = ONBOARDING_OPENING.intent.options ?? [];
		const [title, description] = buildOption.split('\n');

		await service.answerCard(user.id, INTENT_CARD_ID, pick('intent', buildOption));

		const toolResult = eventBus.publish.mock.calls
			.map(([, event]) => event as InstanceAiEvent)
			.find((event) => event.type === 'tool-result');
		expect(JSON.stringify(toolResult)).toContain(title);
		expect(JSON.stringify(toolResult)).not.toContain(description);
		const [, , , answerMessage] = memoryService.seedOpeningMessages.mock.calls[0];
		expect(answerMessage).toContain(title);
		expect(answerMessage).not.toContain(description);
	});
});

describe('startsOnboardingFirstTurn', () => {
	it.each<[boolean, string, string, InstanceAiConfirmRequest]>([
		[true, 'a pick on the idea card', IDEA_CARD_ID, pick('goal', 'Reply to people faster')],
		[
			true,
			'free text on the intent card',
			INTENT_CARD_ID,
			{
				kind: 'questions',
				answers: [{ questionId: 'intent', selectedOptions: [], customText: 'sync my leads' }],
			},
		],
		[
			false,
			'blank free text on the intent card',
			INTENT_CARD_ID,
			{
				kind: 'questions',
				answers: [{ questionId: 'intent', selectedOptions: [], customText: ' ' }],
			},
		],
		[false, 'a pick on the intent card', INTENT_CARD_ID, pick('intent', INTENT_OPTIONS.build)],
		[false, 'a pick on the build card', BUILD_CARD_ID, pick('build', BUILD_OPTIONS.ai)],
		[false, 'an answer of another kind on the idea card', IDEA_CARD_ID, approval],
		[false, 'a pick on another card', 'req-1', pick('goal', 'Reply to people faster')],
	])('returns %s for %s', (expected, _label, requestId, request) => {
		expect(startsOnboardingFirstTurn(requestId, request)).toBe(expected);
	});
});

describe('preloadsSuggestAutomations', () => {
	it.each<[boolean, Record<string, unknown> | undefined]>([
		[true, { source: 'onboarding', onboardingRoute: 'idea' }],
		[false, undefined],
		[false, { source: 'onboarding' }],
		[false, { source: 'onboarding', onboardingRoute: 'build_ai' }],
		[false, { source: 'onboarding', onboardingRoute: 'build_canvas' }],
		[false, { source: 'onboarding', onboardingRoute: 'other' }],
	])('returns %s for %j', (expected, metadata) => {
		expect(preloadsSuggestAutomations(metadata)).toBe(expected);
	});
});

describe('ONBOARDING_OPENING apps step', () => {
	const team = ONBOARDING_OPENING.idea.questions.find((question) => question.id === 'team');
	const apps = ONBOARDING_OPENING.idea.questions.find((question) => question.id === 'apps');
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
