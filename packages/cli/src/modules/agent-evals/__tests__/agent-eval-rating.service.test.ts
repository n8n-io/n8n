import { AGENT_EVALS_FLAG, type CreateAgentEvalRatingPayload } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	AgentEvalDataset,
	AgentEvalDatasetRepository,
	AgentEvalRating,
	AgentEvalRatingRepository,
	AgentEvalResult,
	AgentEvalResultRepository,
	AgentEvalRun,
	AgentEvalRunRepository,
	User,
} from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { PostHogClient } from '@/posthog';

import { AgentEvalRatingService } from '../agent-eval-rating.service';

// Stub the statically imported specifiers to keep the agents module graph out.
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

const user = mock<User>({ id: 'user-1' });
const PROJECT_ID = 'project-1';

describe('AgentEvalRatingService', () => {
	let service: AgentEvalRatingService;
	let logger: Mocked<Logger>;
	let ratingRepository: Mocked<AgentEvalRatingRepository>;
	let resultRepository: Mocked<AgentEvalResultRepository>;
	let runRepository: Mocked<AgentEvalRunRepository>;
	let datasetRepository: Mocked<AgentEvalDatasetRepository>;
	let agentRepository: Mocked<AgentRepository>;
	let postHogClient: Mocked<PostHogClient>;

	const result = mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status: 'success' });
	const run = mock<AgentEvalRun>({ id: 'run-1', datasetId: 'ds-1' });
	const dataset = mock<AgentEvalDataset>({ id: 'ds-1', agentId: 'agent-1' });

	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);

		logger = mock<Logger>();
		ratingRepository = mock<AgentEvalRatingRepository>();
		resultRepository = mock<AgentEvalResultRepository>();
		runRepository = mock<AgentEvalRunRepository>();
		datasetRepository = mock<AgentEvalDatasetRepository>();
		agentRepository = mock<AgentRepository>();
		postHogClient = mock<PostHogClient>();

		postHogClient.getFeatureFlags.mockResolvedValue({ [AGENT_EVALS_FLAG]: true });
		resultRepository.findById.mockResolvedValue(result);
		runRepository.findById.mockResolvedValue(run);
		datasetRepository.findById.mockResolvedValue(dataset);
		agentRepository.existsByIdAndProjectId.mockResolvedValue(true);
		ratingRepository.createRating.mockImplementation(async (attrs) =>
			mock<AgentEvalRating>({ id: 'rating-1', ...attrs }),
		);

		service = new AgentEvalRatingService(
			logger,
			ratingRepository,
			resultRepository,
			runRepository,
			datasetRepository,
			agentRepository,
			postHogClient,
		);
	});

	describe('access control', () => {
		it('rejects when the agent-evals flag is disabled (as not-found, leaking no flag state)', async () => {
			postHogClient.getFeatureFlags.mockResolvedValue({ [AGENT_EVALS_FLAG]: false });

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(NotFoundError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('rejects a caller lacking the rating scope, without touching the eval tables', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(ForbiddenError);
			// Authorization runs before any lookup, so result ids can't be probed.
			expect(resultRepository.findById).not.toHaveBeenCalled();
		});

		// A project viewer holds execute but not update.
		it('requires agent:execute to rate and agent:read to read', async () => {
			await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' });
			expect(vi.mocked(userHasScopes)).toHaveBeenCalledWith(user, ['agent:execute'], false, {
				projectId: PROJECT_ID,
			});

			vi.mocked(userHasScopes).mockClear();

			await service.listRatingsForResult(user, PROJECT_ID, 'res-1');
			expect(vi.mocked(userHasScopes)).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('rejects an unknown result', async () => {
			resultRepository.findById.mockResolvedValue(null);

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(NotFoundError);
		});

		it('rejects a result whose agent lives in another project (as not-found)', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(NotFoundError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});
	});

	describe('rateResult', () => {
		it('persists an upvote with no correction, attributed to the rater', async () => {
			await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' });

			expect(ratingRepository.createRating).toHaveBeenCalledWith({
				resultId: 'res-1',
				vote: 'up',
				comment: null,
				correction: null,
				ratedById: 'user-1',
			});
		});

		it('persists a downvote with a comment and the edited answer', async () => {
			await service.rateResult(user, PROJECT_ID, 'res-1', {
				vote: 'down',
				comment: 'missed the refund policy',
				correction: { finalText: 'Refunds are processed within 14 days.' },
			});

			expect(ratingRepository.createRating).toHaveBeenCalledWith({
				resultId: 'res-1',
				vote: 'down',
				comment: 'missed the refund policy',
				correction: { finalText: 'Refunds are processed within 14 days.' },
				ratedById: 'user-1',
			});
		});

		it.each(['new', 'running'] as const)('refuses to rate a %s case', async (status) => {
			resultRepository.findById.mockResolvedValue(
				mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status }),
			);

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it.each(['error', 'cancelled'] as const)(
			'allows rating a %s case — "it failed" is a judgment',
			async (status) => {
				resultRepository.findById.mockResolvedValue(
					mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status }),
				);

				await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'down' });

				expect(ratingRepository.createRating).toHaveBeenCalledWith(
					expect.objectContaining({ vote: 'down' }),
				);
			},
		);

		it('appends on re-vote rather than overwriting the earlier rating', async () => {
			await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'down' });
			await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'up' });

			expect(ratingRepository.createRating).toHaveBeenCalledTimes(2);
			expect(ratingRepository.createRating).toHaveBeenLastCalledWith(
				expect.objectContaining({ resultId: 'res-1', vote: 'up' }),
			);
		});

		it('rejects an over-long comment', async () => {
			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', {
					vote: 'down',
					comment: 'x'.repeat(2_001),
				}),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('rejects an over-long corrected answer', async () => {
			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', {
					vote: 'down',
					correction: { finalText: 'x'.repeat(20_001) },
				}),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('rejects an oversized correction spread across other keys', async () => {
			const correction = {
				finalText: 'short',
				...Object.fromEntries(
					Array.from({ length: 20 }, (_, i) => [`field${i}`, 'x'.repeat(2_000)]),
				),
			};

			await expect(
				service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'down', correction }),
			).rejects.toThrowError(BadRequestError);
		});

		// The service is the enforcement point until the REST layer's DTO validation
		// lands, and a correction nothing can read defeats the point of capturing it.
		it.each([
			{ label: 'an absent finalText', correction: {} },
			{ label: 'the wrong key', correction: { output: 'the expected answer' } },
			{ label: 'a null finalText', correction: { finalText: null } },
			{ label: 'a blank finalText', correction: { finalText: '   ' } },
			{ label: 'a non-string finalText', correction: { finalText: { nested: 'object' } } },
		])('rejects a correction with $label', async ({ correction }) => {
			// Cast: these shapes are what an unvalidated caller sends, and the tightened
			// payload type now refuses them at compile time.
			const payload = { vote: 'down', correction } as CreateAgentEvalRatingPayload;

			await expect(service.rateResult(user, PROJECT_ID, 'res-1', payload)).rejects.toThrowError(
				BadRequestError,
			);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('keeps extra correction keys alongside the edited answer', async () => {
			const correction = { finalText: 'the expected answer', fields: { tone: 'formal' } };

			await service.rateResult(user, PROJECT_ID, 'res-1', { vote: 'down', correction });

			expect(ratingRepository.createRating).toHaveBeenCalledWith(
				expect.objectContaining({ correction }),
			);
		});
	});

	describe('listRatingsForResult', () => {
		it('returns the result history', async () => {
			const ratings = [mock<AgentEvalRating>({ id: 'rating-2' })];
			ratingRepository.findByResultId.mockResolvedValue(ratings);

			await expect(service.listRatingsForResult(user, PROJECT_ID, 'res-1')).resolves.toBe(ratings);
			expect(ratingRepository.findByResultId).toHaveBeenCalledWith('res-1');
		});
	});

	describe('listLatestRatingsForRun', () => {
		it('returns the newest rating per result for the run', async () => {
			const ratings = [mock<AgentEvalRating>({ id: 'rating-3' })];
			ratingRepository.findLatestByRunId.mockResolvedValue(ratings);

			await expect(service.listLatestRatingsForRun(user, PROJECT_ID, 'run-1')).resolves.toBe(
				ratings,
			);
			expect(ratingRepository.findLatestByRunId).toHaveBeenCalledWith('run-1');
		});

		it('rejects a run from another project (as not-found)', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);

			await expect(service.listLatestRatingsForRun(user, PROJECT_ID, 'run-1')).rejects.toThrowError(
				NotFoundError,
			);
			expect(ratingRepository.findLatestByRunId).not.toHaveBeenCalled();
		});
	});
});
