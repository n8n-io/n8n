import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentEvalService } from '../agent-eval.service';
import type { AgentEvalsFlagGate } from '../agent-evals-flag-gate';
import { AgentEvalsController } from '../agent-evals.controller';

vi.mock('../agent-eval.service', () => ({ AgentEvalService: class AgentEvalService {} }));
vi.mock('../agent-evals-flag-gate', () => ({ AgentEvalsFlagGate: class AgentEvalsFlagGate {} }));

const PROJECT_ID = 'proj-1';
const AGENT_ID = 'agent-1';

describe('AgentEvalsController', () => {
	const user = mock<User>({ id: 'user-1' });

	let service: MockProxy<AgentEvalService>;
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

	beforeEach(() => {
		service = mock<AgentEvalService>();
		flagGate = mock<AgentEvalsFlagGate>();
		flagGate.assertEnabled.mockResolvedValue(undefined);
		controller = new AgentEvalsController(service, flagGate);
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

		it.each([
			// Reads stay on agent:read; anything that writes eval config — including
			// generation, which spends the builder's model credits — needs
			// agent:update; starting/cancelling a run is agent:execute.
			['listDatasets', 'agent:read'],
			['getDataset', 'agent:read'],
			['listRuns', 'agent:read'],
			['getRun', 'agent:read'],
			['getRunSummary', 'agent:read'],
			['createDataset', 'agent:update'],
			['updateDataset', 'agent:update'],
			['deleteDataset', 'agent:update'],
			['generateDraftCases', 'agent:update'],
			['startRun', 'agent:execute'],
			['cancelRun', 'agent:execute'],
		])('%s uses %s', (handlerName, scope) => {
			expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
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
			['listRuns', async () => await controller.listRuns(datasetReq())],
			['getRun', async () => await controller.getRun(runReq())],
			['getRunSummary', async () => await controller.getRunSummary(runReq())],
			['cancelRun', async () => await controller.cancelRun(runReq())],
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
	});
});
