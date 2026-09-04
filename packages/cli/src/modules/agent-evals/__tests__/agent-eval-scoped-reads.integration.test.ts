import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { Agent } from '@/modules/agents/entities/agent.entity';

/**
 * Real DB on purpose: mocking the entity manager only proves which `where` object
 * was built, not that the filter applied — and a test using the *matching* agent
 * would pass even with the filter dropped. So every case here pairs the allowed
 * read with the foreign-agent read that must come back empty.
 */
describe('agent-eval scoped repository reads (integration)', () => {
	let datasetRepository: AgentEvalDatasetRepository;
	let runRepository: AgentEvalRunRepository;
	let resultRepository: AgentEvalResultRepository;

	/** Real agent row so `agent_eval_dataset.agentId`'s FK holds. */
	async function createAgent(): Promise<Agent> {
		const project = await createTeamProject();
		return await Container.get(DataSource)
			.getRepository(Agent)
			.save(Object.assign(new Agent(), { name: 'test agent', projectId: project.id }));
	}

	beforeAll(async () => {
		await testModules.loadModules(['data-table', 'agents']);
		await testDb.init();
		datasetRepository = Container.get(AgentEvalDatasetRepository);
		runRepository = Container.get(AgentEvalRunRepository);
		resultRepository = Container.get(AgentEvalResultRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['AgentEvalResult', 'AgentEvalRun', 'AgentEvalDataset']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Two agents, each owning a dataset; a run + case under the first one's. */
	async function seedTwoAgents() {
		const [own, foreign] = await Promise.all([createAgent(), createAgent()]);

		const dataset = await datasetRepository.createDataset({
			name: 'own dataset',
			agentId: own.id,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-own' },
			columnMapping: { input: 'question' },
		});
		const foreignDataset = await datasetRepository.createDataset({
			name: 'foreign dataset',
			agentId: foreign.id,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-foreign' },
		});

		const run = await runRepository.createRun({ datasetId: dataset.id });
		const [result] = await resultRepository.seedResults([
			{ runId: run.id, sourceRowId: 'row-1', runIndex: 0, input: { input: 'q' } },
		]);

		return { own, foreign, dataset, foreignDataset, run, result };
	}

	describe('dataset reads', () => {
		it('resolves a dataset for its own agent and hides it from another', async () => {
			const { own, foreign, dataset } = await seedTwoAgents();

			await expect(datasetRepository.findByIdAndAgentId(dataset.id, own.id)).resolves.toMatchObject(
				{ id: dataset.id },
			);
			await expect(
				datasetRepository.findByIdAndAgentId(dataset.id, foreign.id),
			).resolves.toBeNull();
		});

		it('lists only the addressed agent’s datasets', async () => {
			const { own, dataset } = await seedTwoAgents();

			const listed = await datasetRepository.findByAgentId(own.id);

			expect(listed.map((d) => d.id)).toEqual([dataset.id]);
		});
	});

	// A run has no agentId of its own, so these reads filter via the dataset relation.
	describe('run reads', () => {
		it('resolves a run for its dataset’s agent and hides it from another', async () => {
			const { own, foreign, run } = await seedTwoAgents();

			await expect(runRepository.findByIdAndAgentId(run.id, own.id)).resolves.toMatchObject({
				id: run.id,
			});
			await expect(runRepository.findByIdAndAgentId(run.id, foreign.id)).resolves.toBeNull();
		});

		// TypeORM pages a relation-filtered query with a distinct sub-query, so only
		// a real database proves it. Every run shares one `createdAt`, which is the
		// case the `id` tiebreak exists for.
		it('walks a dataset’s runs page by page without repeating or dropping one', async () => {
			const { own, dataset } = await seedTwoAgents();
			// One run exists from the seed; five more leave a partial second page.
			for (let i = 0; i < 5; i++) await runRepository.createRun({ datasetId: dataset.id });
			// `@CreateDateColumn` only auto-fills on insert, so pin them explicitly.
			const sharedCreatedAt = new Date('2026-01-01T00:00:00.000Z');
			await runRepository.update({ datasetId: dataset.id }, { createdAt: sharedCreatedAt });

			const [firstPage, total] = await runRepository.findAndCountByDatasetIdAndAgentId(
				dataset.id,
				own.id,
				{ take: 4, skip: 0 },
			);
			const [secondPage] = await runRepository.findAndCountByDatasetIdAndAgentId(
				dataset.id,
				own.id,
				{ take: 4, skip: 4 },
			);
			// The same rows read in one go, as the yardstick for the paged walk.
			const [whole] = await runRepository.findAndCountByDatasetIdAndAgentId(dataset.id, own.id);

			// The count is the whole set, not the page.
			expect(total).toBe(6);
			expect(firstPage).toHaveLength(4);
			expect(secondPage).toHaveLength(2);

			const walked = [...firstPage, ...secondPage].map((r) => r.id);
			// No run repeated across pages, and none lost between them.
			expect(new Set(walked).size).toBe(6);
			// Paging agrees with reading everything at once — compared against the
			// database's own ordering, since its collation is not JS's sort order.
			expect(walked).toEqual(whole.map((r) => r.id));
		});

		it('pages a run’s cases in seed order and counts them all', async () => {
			const { dataset } = await seedTwoAgents();
			const run = await runRepository.createRun({ datasetId: dataset.id });
			await resultRepository.seedResults(
				Array.from({ length: 5 }, (_, i) => ({
					runId: run.id,
					sourceRowId: `row-${i}`,
					runIndex: i,
					input: { input: `q${i}` },
				})),
			);

			const [page, total] = await resultRepository.findAndCountByRunId(run.id, {
				take: 2,
				skip: 2,
			});

			// `seedTwoAgents` seeded a case under another run, so 5 rather than 6
			// is what shows the count is scoped to this one.
			expect(total).toBe(5);
			expect(page.map((r) => r.sourceRowId)).toEqual(['row-2', 'row-3']);
		});

		it('lists a dataset’s runs only for that dataset’s agent', async () => {
			const { own, foreign, dataset, run } = await seedTwoAgents();

			await expect(
				runRepository.findAndCountByDatasetIdAndAgentId(dataset.id, own.id),
			).resolves.toMatchObject([[{ id: run.id }], 1]);
			// Right dataset id, wrong agent: the pairing has to be checked, or a foreign
			// caller reads another agent's run history — and a bare count would leak
			// how many runs that agent has.
			await expect(
				runRepository.findAndCountByDatasetIdAndAgentId(dataset.id, foreign.id),
			).resolves.toEqual([[], 0]);
		});
	});

	describe('dataset mutations', () => {
		it('patches a dataset for its own agent', async () => {
			const { own, dataset } = await seedTwoAgents();

			const updated = await datasetRepository.updateDataset(dataset.id, own.id, {
				name: 'renamed',
				description: null,
			});

			expect(updated).toMatchObject({ id: dataset.id, name: 'renamed', description: null });
		});

		it('refuses to patch another agent’s dataset and leaves it untouched', async () => {
			const { foreign, dataset } = await seedTwoAgents();

			await expect(
				datasetRepository.updateDataset(dataset.id, foreign.id, { name: 'hijacked' }),
			).resolves.toBeNull();

			const reread = await datasetRepository.findById(dataset.id);
			expect(reread?.name).toBe('own dataset');
		});

		it('refuses to delete another agent’s dataset and leaves the row in place', async () => {
			const { foreign, dataset } = await seedTwoAgents();

			await expect(datasetRepository.deleteDataset(dataset.id, foreign.id)).resolves.toBe(false);
			await expect(datasetRepository.findById(dataset.id)).resolves.not.toBeNull();
		});

		// The service never touches runs or results, so the cascade is what removes them.
		it('deletes a dataset for its own agent, cascading to its runs and results', async () => {
			const { own, dataset, run, result } = await seedTwoAgents();

			await expect(datasetRepository.deleteDataset(dataset.id, own.id)).resolves.toBe(true);

			await expect(datasetRepository.findById(dataset.id)).resolves.toBeNull();
			await expect(runRepository.findById(run.id)).resolves.toBeNull();
			await expect(resultRepository.findAndCountByRunId(run.id)).resolves.toEqual([[], 0]);
			expect(result).toBeDefined();
		});
	});
});
