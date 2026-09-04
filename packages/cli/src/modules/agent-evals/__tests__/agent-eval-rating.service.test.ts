import type { CreateAgentEvalRatingPayload } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type {
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
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { AgentEvalRatingService } from '../agent-eval-rating.service';

// Stub the statically imported specifier to keep the agents module graph out.
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));

const user = mock<User>({ id: 'user-1' });
const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

// Fixed so the mapper's ISO strings are assertable.
const RATED_AT = new Date('2026-07-31T12:00:00.000Z');

const makeRating = (overrides: Partial<AgentEvalRating> = {}) =>
	mock<AgentEvalRating>({
		id: 'rating-1',
		resultId: 'res-1',
		vote: 'up',
		comment: null,
		correction: null,
		ratedById: 'user-1',
		createdAt: RATED_AT,
		updatedAt: RATED_AT,
		...overrides,
	});

describe('AgentEvalRatingService', () => {
	let service: AgentEvalRatingService;
	let logger: Mocked<Logger>;
	let moduleRegistry: Mocked<ModuleRegistry>;
	let ratingRepository: Mocked<AgentEvalRatingRepository>;
	let resultRepository: Mocked<AgentEvalResultRepository>;
	let runRepository: Mocked<AgentEvalRunRepository>;
	let agentRepository: Mocked<AgentRepository>;

	const result = mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status: 'success' });
	const run = mock<AgentEvalRun>({ id: 'run-1', datasetId: 'ds-1' });

	beforeEach(() => {
		logger = mock<Logger>();
		moduleRegistry = mock<ModuleRegistry>();
		ratingRepository = mock<AgentEvalRatingRepository>();
		resultRepository = mock<AgentEvalResultRepository>();
		runRepository = mock<AgentEvalRunRepository>();
		agentRepository = mock<AgentRepository>();

		moduleRegistry.isActive.mockReturnValue(true);
		resultRepository.findById.mockResolvedValue(result);
		runRepository.findByIdAndAgentId.mockResolvedValue(run);
		agentRepository.existsByIdAndProjectId.mockResolvedValue(true);
		ratingRepository.findByResultId.mockResolvedValue([]);
		ratingRepository.findLatestByRunId.mockResolvedValue([]);
		ratingRepository.createRating.mockImplementation(async (attrs) => makeRating(attrs));

		service = new AgentEvalRatingService(
			logger,
			moduleRegistry,
			ratingRepository,
			resultRepository,
			runRepository,
			agentRepository,
		);
	});

	/**
	 * The project scope and the rollout flag are the controller's to enforce, so
	 * what is asserted here is ownership: that no id from another agent or project
	 * resolves, and that a foreign one reads as missing rather than forbidden.
	 */
	describe('ownership scoping', () => {
		it('rejects an unknown result', async () => {
			resultRepository.findById.mockResolvedValue(null);

			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(NotFoundError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('rejects an agent outside the path project, without touching the eval tables', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);

			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(NotFoundError);
			// Ownership resolves before any lookup, so result ids can't be probed.
			expect(resultRepository.findById).not.toHaveBeenCalled();
		});

		// The result exists and its project checks out, but its run belongs to a
		// sibling agent — `@ProjectScope` cannot catch this, only the agent filter.
		it.each([
			[
				'rateResult',
				async (svc: AgentEvalRatingService) =>
					await svc.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' }),
			],
			[
				'listRatingsForResult',
				async (svc: AgentEvalRatingService) =>
					await svc.listRatingsForResult(AGENT_ID, PROJECT_ID, 'res-1'),
			],
			[
				'listLatestRatingsForRun',
				async (svc: AgentEvalRatingService) =>
					await svc.listLatestRatingsForRun(AGENT_ID, PROJECT_ID, 'run-1'),
			],
		])('%s rejects an id belonging to another agent (as not-found)', async (_name, call) => {
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(call(service)).rejects.toThrowError(NotFoundError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
			expect(ratingRepository.findByResultId).not.toHaveBeenCalled();
			expect(ratingRepository.findLatestByRunId).not.toHaveBeenCalled();
		});

		it('resolves runs through the path agent rather than a bare id', async () => {
			await service.listLatestRatingsForRun(AGENT_ID, PROJECT_ID, 'run-1');

			expect(runRepository.findByIdAndAgentId).toHaveBeenCalledWith('run-1', AGENT_ID);
		});

		// With `agents` off there is no agent to address, so the surface reads as
		// unknown rather than misused — and the message still names the module, so a
		// TypeORM missing-metadata error never reaches the caller.
		it('reports an inactive dependency module as not-found, naming the module', async () => {
			moduleRegistry.isActive.mockReturnValue(false);

			const rate = async () =>
				await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' });

			await expect(rate()).rejects.toThrowError(NotFoundError);
			await expect(rate()).rejects.toThrow('require these modules to be active');
			expect(agentRepository.existsByIdAndProjectId).not.toHaveBeenCalled();
		});
	});

	describe('rateResult', () => {
		it('persists an upvote with no correction, attributed to the rater', async () => {
			await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' });

			expect(ratingRepository.createRating).toHaveBeenCalledWith({
				resultId: 'res-1',
				vote: 'up',
				comment: null,
				correction: null,
				ratedById: 'user-1',
			});
		});

		it('persists a downvote with a comment and the edited answer', async () => {
			await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', {
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

		// Field-by-field, so a new entity column can't leak onto the wire.
		it('returns the persisted rating as a wire record with ISO timestamps', async () => {
			const correction = { finalText: 'the expected answer' };

			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'down', correction }),
			).resolves.toEqual({
				id: 'rating-1',
				resultId: 'res-1',
				vote: 'down',
				comment: null,
				correction,
				ratedById: 'user-1',
				createdAt: RATED_AT.toISOString(),
				updatedAt: RATED_AT.toISOString(),
			});
		});

		it.each(['new', 'running'] as const)('refuses to rate a %s case', async (status) => {
			resultRepository.findById.mockResolvedValue(
				mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status }),
			);

			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' }),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it.each(['error', 'cancelled'] as const)(
			'allows rating a %s case — "it failed" is a judgment',
			async (status) => {
				resultRepository.findById.mockResolvedValue(
					mock<AgentEvalResult>({ id: 'res-1', runId: 'run-1', status }),
				);

				await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'down' });

				expect(ratingRepository.createRating).toHaveBeenCalledWith(
					expect.objectContaining({ vote: 'down' }),
				);
			},
		);

		it('appends on re-vote rather than overwriting the earlier rating', async () => {
			await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'down' });
			await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'up' });

			expect(ratingRepository.createRating).toHaveBeenCalledTimes(2);
			expect(ratingRepository.createRating).toHaveBeenLastCalledWith(
				expect.objectContaining({ resultId: 'res-1', vote: 'up' }),
			);
		});

		it('rejects an over-long comment', async () => {
			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', {
					vote: 'down',
					comment: 'x'.repeat(2_001),
				}),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('rejects an over-long corrected answer', async () => {
			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', {
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
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'down', correction }),
			).rejects.toThrowError(BadRequestError);
		});

		// The route's DTO now rejects these shapes first, but the length caps live
		// nowhere else and a correction nothing can read defeats the point of
		// capturing it — so the service keeps checking rather than trusting a caller.
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

			await expect(
				service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', payload),
			).rejects.toThrowError(BadRequestError);
			expect(ratingRepository.createRating).not.toHaveBeenCalled();
		});

		it('keeps extra correction keys alongside the edited answer', async () => {
			const correction = { finalText: 'the expected answer', fields: { tone: 'formal' } };

			await service.rateResult(user, AGENT_ID, PROJECT_ID, 'res-1', { vote: 'down', correction });

			expect(ratingRepository.createRating).toHaveBeenCalledWith(
				expect.objectContaining({ correction }),
			);
		});
	});

	describe('listRatingsForResult', () => {
		it('returns the result history as wire records', async () => {
			ratingRepository.findByResultId.mockResolvedValue([makeRating({ id: 'rating-2' })]);

			await expect(service.listRatingsForResult(AGENT_ID, PROJECT_ID, 'res-1')).resolves.toEqual([
				expect.objectContaining({ id: 'rating-2', resultId: 'res-1' }),
			]);
			expect(ratingRepository.findByResultId).toHaveBeenCalledWith('res-1');
		});
	});

	describe('listLatestRatingsForRun', () => {
		it('returns the newest rating per result for the run', async () => {
			ratingRepository.findLatestByRunId.mockResolvedValue([makeRating({ id: 'rating-3' })]);

			await expect(service.listLatestRatingsForRun(AGENT_ID, PROJECT_ID, 'run-1')).resolves.toEqual(
				[expect.objectContaining({ id: 'rating-3' })],
			);
			expect(ratingRepository.findLatestByRunId).toHaveBeenCalledWith('run-1');
		});
	});
});
