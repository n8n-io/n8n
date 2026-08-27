import {
	AGENT_EVAL_RESULTS_DEFAULT_TAKE,
	AgentEvalRunDetailQueryDto,
	MAX_ITEMS_PER_PAGE,
	PaginationDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentEvalRatingService } from '../agent-eval-rating.service';
import type { AgentEvalService } from '../agent-eval.service';
import type { AgentEvalsFlagGate } from '../agent-evals-flag-gate';
import { AgentEvalsController } from '../agent-evals.controller';

vi.mock('../agent-eval.service', () => ({ AgentEvalService: class AgentEvalService {} }));
vi.mock('../agent-eval-rating.service', () => ({
	AgentEvalRatingService: class AgentEvalRatingService {},
}));
vi.mock('../agent-evals-flag-gate', () => ({ AgentEvalsFlagGate: class AgentEvalsFlagGate {} }));

const PROJECT_ID = 'proj-1';
const AGENT_ID = 'agent-1';
// What each route binds when the client sends no window. The two DTOs differ:
// run detail pages cases, so it defaults wider.
const PAGE = PaginationDto.parse({});
const RUN_PAGE = AgentEvalRunDetailQueryDto.parse({});

describe('AgentEvalsController', () => {
	const user = mock<User>({ id: 'user-1' });

	let service: MockProxy<AgentEvalService>;
	let ratingService: MockProxy<AgentEvalRatingService>;
	let flagGate: MockProxy<AgentEvalsFlagGate>;
	let controller: AgentEvalsController;

	function makeReq<P extends Record<string, unknown>>(
		params: P,
		body: unknown = {},
	): AuthenticatedRequest<P> {
		return { user, params, body } as unknown as AuthenticatedRequest<P>;
	}

	const agentReq = () => makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID });
	const datasetReq = () => makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID, datasetId: 'ds-1' });
	const runReq = () => makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID, runId: 'run-1' });
	const resultReq = () => makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID, resultId: 'res-1' });

	beforeEach(() => {
		service = mock<AgentEvalService>();
		ratingService = mock<AgentEvalRatingService>();
		flagGate = mock<AgentEvalsFlagGate>();
		flagGate.assertEnabled.mockResolvedValue(undefined);
		controller = new AgentEvalsController(service, ratingService, flagGate);
	});

	/**
	 * Regression guard: a route added without an access scope fails here. Every
	 * agent-eval route is authenticated and project-scoped — there is no public
	 * surface, so the assertion is unconditional.
	 */
	describe('route access scopes', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AgentEvalsController as never,
		);
		const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
			handlerName,
			route,
		}));

		it('registers every handler', () => {
			expect(routeCases).not.toHaveLength(0);
		});

		it.each(routeCases)('$handlerName is gated by a project-scoped agent:* check', ({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('agent:')).toBe(true);
		});

		// Reads on agent:read; eval-config writes — generation, which spends the
		// builder's model credits, rating, and cancellation, which acts on a run
		// someone else started — on agent:update. Only starting is agent:execute.
		const expectedScopes = {
			listDatasets: 'agent:read',
			getDataset: 'agent:read',
			listRuns: 'agent:read',
			getRun: 'agent:read',
			getRunSummary: 'agent:read',
			listRatingsForResult: 'agent:read',
			listLatestRatingsForRun: 'agent:read',
			createDataset: 'agent:update',
			updateDataset: 'agent:update',
			deleteDataset: 'agent:update',
			generateDraftCases: 'agent:update',
			rateResult: 'agent:update',
			cancelRun: 'agent:update',
			startRun: 'agent:execute',
		} as const;

		it.each(Object.entries(expectedScopes))('%s uses %s', (handlerName, scope) => {
			expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
		});

		// The controller is the only enforcement point for the scopes, so a route
		// added without a deliberate entry above is a scope nobody chose.
		it('pins an expected scope for every registered handler', () => {
			expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual(
				Object.keys(expectedScopes).sort(),
			);
		});

		// `PROJECT_CHAT_USER_SCOPES` is only `agent:execute` + `workflow:execute-chat`,
		// so cancel on `agent:execute` would let a chat-only user stop any run.
		it('keeps cancel off the scope a chat-only user holds', () => {
			expect(metadata.routes.get('cancelRun')?.accessScope?.scope).not.toBe('agent:execute');
			expect(metadata.routes.get('startRun')?.accessScope?.scope).toBe('agent:execute');
		});
	});

	// Flag-off must look like an unknown endpoint on every route, and must not
	// reach the service.
	describe('flag gating', () => {
		const calls: Array<[string, () => Promise<unknown>]> = [
			['listDatasets', async () => await controller.listDatasets(agentReq())],
			['getDataset', async () => await controller.getDataset(datasetReq())],
			[
				'createDataset',
				async () =>
					await controller.createDataset(
						makeReq(
							{ projectId: PROJECT_ID, agentId: AGENT_ID },
							{
								name: 'cases',
								agentId: AGENT_ID,
								datasetSource: 'data_table',
								datasetRef: { dataTableId: 'dt-1' },
							},
						),
					),
			],
			[
				'updateDataset',
				async () => await controller.updateDataset(datasetReq(), undefined, { name: 'x' }),
			],
			['deleteDataset', async () => await controller.deleteDataset(datasetReq())],
			[
				'generateDraftCases',
				async () => await controller.generateDraftCases(agentReq(), undefined, {}),
			],
			['startRun', async () => await controller.startRun(datasetReq(), undefined, {})],
			['listRuns', async () => await controller.listRuns(datasetReq(), undefined, PAGE)],
			['getRun', async () => await controller.getRun(runReq(), undefined, RUN_PAGE)],
			['getRunSummary', async () => await controller.getRunSummary(runReq())],
			['cancelRun', async () => await controller.cancelRun(runReq())],
			[
				'rateResult',
				async () => await controller.rateResult(resultReq(), undefined, { vote: 'up' }),
			],
			['listRatingsForResult', async () => await controller.listRatingsForResult(resultReq())],
			['listLatestRatingsForRun', async () => await controller.listLatestRatingsForRun(runReq())],
		];

		it.each(calls)('%s 404s when the flag is off for the user', async (_name, call) => {
			flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));

			await expect(call()).rejects.toThrow(NotFoundError);
		});

		it.each(calls)('%s asks the gate about the requesting user', async (_name, call) => {
			await call().catch(() => {});

			expect(flagGate.assertEnabled).toHaveBeenCalledWith(user);
		});
	});

	describe('delegation', () => {
		it('lists datasets for the path agent', async () => {
			await controller.listDatasets(agentReq());

			expect(service.listDatasets).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID);
		});

		it('passes a valid create body through', async () => {
			const body = {
				name: 'cases',
				agentId: AGENT_ID,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			};

			await controller.createDataset(makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID }, body));

			expect(service.createDataset).toHaveBeenCalledWith(
				user,
				AGENT_ID,
				PROJECT_ID,
				expect.objectContaining(body),
			);
		});

		// This body carries the `DatasetRef` union, so it can't be bound via
		// `@Body` and is parsed in the handler — which means the handler owns
		// turning invalid input into a 400 rather than a 500.
		it('rejects an invalid create body as a bad request', async () => {
			await expect(
				controller.createDataset(
					makeReq({ projectId: PROJECT_ID, agentId: AGENT_ID }, { name: '' }),
				),
			).rejects.toThrow(BadRequestError);

			expect(service.createDataset).not.toHaveBeenCalled();
		});

		it('rejects a create body with an unknown dataset source', async () => {
			await expect(
				controller.createDataset(
					makeReq(
						{ projectId: PROJECT_ID, agentId: AGENT_ID },
						{
							name: 'cases',
							agentId: AGENT_ID,
							datasetSource: 'sqlite',
							datasetRef: { dataTableId: 'dt-1' },
						},
					),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('starts a run for the path dataset', async () => {
			await controller.startRun(datasetReq(), undefined, {});

			expect(service.startRun).toHaveBeenCalledWith(user, AGENT_ID, PROJECT_ID, 'ds-1', {});
		});

		it('reports a delete as a success envelope', async () => {
			await expect(controller.deleteDataset(datasetReq())).resolves.toEqual({ success: true });

			expect(service.deleteDataset).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'ds-1');
		});

		it('reads a run summary scoped to the path agent', async () => {
			await controller.getRunSummary(runReq());

			expect(service.getRunSummary).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'run-1');
		});

		it('cancels a run scoped to the path agent', async () => {
			await controller.cancelRun(runReq());

			expect(service.cancelRun).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'run-1');
		});

		// The rating service resolves the result through the path agent, so the agent
		// has to reach it — a result id alone would be unscoped.
		it('rates a result scoped to the path agent, attributed to the caller', async () => {
			const payload = { vote: 'down' as const, correction: { finalText: 'the right answer' } };

			await controller.rateResult(resultReq(), undefined, payload);

			expect(ratingService.rateResult).toHaveBeenCalledWith(
				user,
				AGENT_ID,
				PROJECT_ID,
				'res-1',
				payload,
			);
		});

		it('reads a result rating history scoped to the path agent', async () => {
			await controller.listRatingsForResult(resultReq());

			expect(ratingService.listRatingsForResult).toHaveBeenCalledWith(
				AGENT_ID,
				PROJECT_ID,
				'res-1',
			);
		});

		it('reads a run rating summary scoped to the path agent', async () => {
			await controller.listLatestRatingsForRun(runReq());

			expect(ratingService.listLatestRatingsForRun).toHaveBeenCalledWith(
				AGENT_ID,
				PROJECT_ID,
				'run-1',
			);
		});
	});

	// A controller that dropped `query` would silently serve the default page.
	describe('pagination', () => {
		it('forwards the run-list window to the service', async () => {
			const query = PaginationDto.parse({ take: '25', skip: '50' });

			await controller.listRuns(datasetReq(), undefined, query);

			expect(service.listRuns).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'ds-1', {
				take: 25,
				skip: 50,
			});
		});

		it('forwards the run-detail window to the service', async () => {
			const query = AgentEvalRunDetailQueryDto.parse({ take: '25', skip: '50' });

			await controller.getRun(runReq(), undefined, query);

			expect(service.getRunDetail).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'run-1', {
				take: 25,
				skip: 50,
			});
		});

		// The DTO always supplies a window, so neither route defaults to unbounded.
		it('bounds both list reads even when the client sends no window', async () => {
			await controller.listRuns(datasetReq(), undefined, PaginationDto.parse({}));
			await controller.getRun(runReq(), undefined, AgentEvalRunDetailQueryDto.parse({}));

			for (const call of [service.listRuns, service.getRunDetail]) {
				const page = call.mock.calls[0]?.at(-1) as { take: number; skip: number };
				expect(page.take).toBeGreaterThan(0);
				expect(page.skip).toBe(0);
			}
		});

		// Opening a run reads its cases, so this route defaults wider.
		it('defaults the run-detail window wider than the shared list default', async () => {
			await controller.getRun(runReq(), undefined, AgentEvalRunDetailQueryDto.parse({}));

			expect(service.getRunDetail).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID, 'run-1', {
				take: AGENT_EVAL_RESULTS_DEFAULT_TAKE,
				skip: 0,
			});
			expect(AGENT_EVAL_RESULTS_DEFAULT_TAKE).toBeGreaterThan(PaginationDto.parse({}).take);
		});

		// A bigger ask is still held to the shared cap.
		it('clamps an oversized run-detail window to the shared maximum', async () => {
			const query = AgentEvalRunDetailQueryDto.parse({ take: '9999' });

			await controller.getRun(runReq(), undefined, query);

			expect(query.take).toBe(MAX_ITEMS_PER_PAGE);
		});
	});
});
