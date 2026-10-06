import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiOnboardingService } from '../onboarding';
import { ONBOARDING_OPENING } from '../onboarding-opening';

const user = mock<User>({ id: 'user-1', firstName: 'Ada' });
const THREAD_ID = 'thread-1';
const urlSurvey = { survey: { what_team_are_you_on: 'Marketing' }, surveySource: 'url' };

function setup(created = true) {
	const memoryService = mock<InstanceAiMemoryService>();
	const telemetry = mock<Telemetry>();
	memoryService.ensureThread.mockResolvedValue({
		thread: {
			id: THREAD_ID,
			resourceId: user.id,
			createdAt: '2026-09-28T00:00:00.000Z',
			updatedAt: '2026-09-28T00:00:00.000Z',
		},
		created,
	});
	const service = new InstanceAiOnboardingService(memoryService, telemetry);
	return { service, telemetry, memoryService };
}

describe('InstanceAiOnboardingService.ensureThread', () => {
	it('creates the thread with the onboarding title', async () => {
		const { service, memoryService } = setup();
		const launchMetadata = {
			source: 'onboarding',
			origin: 'external',
			sourceContext: urlSurvey,
		} as const;

		await service.ensureThread(user, THREAD_ID, 'project-1', launchMetadata);

		expect(memoryService.ensureThread).toHaveBeenCalledWith(
			user.id,
			THREAD_ID,
			'project-1',
			launchMetadata,
			ONBOARDING_OPENING.title,
		);
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

	it('tracks no team when the survey has none', async () => {
		const { service, telemetry } = setup();

		await service.ensureThread(user, THREAD_ID, 'project-1', {
			source: 'onboarding',
			origin: 'external',
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_AI_ASSISTANT_ONBOARDING,
			{ user_id: user.id, thread_id: THREAD_ID, team: null, team_source: null },
		);
	});

	it('tracks nothing when the thread already exists', async () => {
		const { service, telemetry } = setup(false);

		await service.ensureThread(user, THREAD_ID, 'project-1', {
			source: 'onboarding',
			origin: 'external',
			sourceContext: urlSurvey,
		});

		expect(telemetry.track).not.toHaveBeenCalled();
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
