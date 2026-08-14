import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	AgentEvalDatasetRepository,
	AgentEvalRatingRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
	GLOBAL_OWNER_ROLE,
	type AgentEvalResult,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { Agent } from '@/modules/agents/entities/agent.entity';
import { createUserShell } from '@test-integration/db/users';

// `findLatestByRunId` joins two tables, so it runs against the real driver here:
// a mocked entity manager would green-light SQL the database rejects.

let owner: User;
let ratingRepository: AgentEvalRatingRepository;
let resultRepository: AgentEvalResultRepository;
let runRepository: AgentEvalRunRepository;
let datasetRepository: AgentEvalDatasetRepository;

/** Insert a minimal real agent row so `agent_eval_dataset.agentId`'s FK holds. */
async function createAgent(projectId: string): Promise<Agent> {
	return await Container.get(DataSource)
		.getRepository(Agent)
		.save(Object.assign(new Agent(), { name: 'test agent', projectId }));
}

/** A run with `count` seeded result rows, wired through a real dataset + agent. */
async function createRunWithResults(count: number): Promise<AgentEvalResult[]> {
	const project = await createTeamProject();
	const agent = await createAgent(project.id);

	const dataset = await datasetRepository.createDataset({
		name: 'ds',
		agentId: agent.id,
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		columnMapping: { input: 'question' },
		createdById: owner.id,
	});
	const run = await runRepository.createRun({ datasetId: dataset.id, createdById: owner.id });

	return await resultRepository.seedResults(
		Array.from({ length: count }, (_, index) => ({ runId: run.id, runIndex: index })),
	);
}

// Timestamps are millisecond-precision, so a pause guarantees a newer `createdAt`.
const tick = async () => await new Promise((resolve) => setTimeout(resolve, 10));

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();
	owner = await createUserShell(GLOBAL_OWNER_ROLE);

	ratingRepository = Container.get(AgentEvalRatingRepository);
	resultRepository = Container.get(AgentEvalResultRepository);
	runRepository = Container.get(AgentEvalRunRepository);
	datasetRepository = Container.get(AgentEvalDatasetRepository);
});

beforeEach(async () => {
	// `Agent`/`Project` aren't truncated: per-test, and absent from testDb's union.
	await testDb.truncate(['AgentEvalRating', 'AgentEvalResult', 'AgentEvalRun', 'AgentEvalDataset']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('AgentEvalRatingRepository.findLatestByRunId (integration)', () => {
	it('returns only the newest rating for a re-voted result', async () => {
		const [result] = await createRunWithResults(1);

		await ratingRepository.createRating({
			resultId: result.id,
			vote: 'down',
			correction: { finalText: 'the answer the agent should have given' },
			ratedById: owner.id,
		});
		await tick();
		const newest = await ratingRepository.createRating({
			resultId: result.id,
			vote: 'up',
			comment: 'second look, this is fine',
			ratedById: owner.id,
		});

		const latest = await ratingRepository.findLatestByRunId(result.runId);

		expect(latest).toHaveLength(1);
		expect(latest[0]).toMatchObject({ id: newest.id, vote: 'up' });
		// The superseded correction is still on record for calibration.
		await expect(ratingRepository.findByResultId(result.id)).resolves.toHaveLength(2);
	});

	it('returns one rating per rated result and skips unrated ones', async () => {
		const [first, second, unrated] = await createRunWithResults(3);

		await ratingRepository.createRating({ resultId: first.id, vote: 'up' });
		await ratingRepository.createRating({ resultId: second.id, vote: 'down' });

		const latest = await ratingRepository.findLatestByRunId(first.runId);

		expect(latest).toHaveLength(2);
		expect(latest.map((rating) => rating.resultId).sort()).toEqual([first.id, second.id].sort());
		expect(latest.map((rating) => rating.resultId)).not.toContain(unrated.id);
	});

	it('persists the corrected answer as JSON, readable back unchanged', async () => {
		const [result] = await createRunWithResults(1);
		const correction = { finalText: 'Refunds are processed within 14 days.' };

		await ratingRepository.createRating({
			resultId: result.id,
			vote: 'down',
			correction,
			ratedById: owner.id,
		});

		const [latest] = await ratingRepository.findLatestByRunId(result.runId);

		expect(latest.correction).toEqual(correction);
		expect(latest.ratedById).toBe(owner.id);
		expect(latest.createdAt).toBeInstanceOf(Date);
	});

	it('scopes to the run, ignoring ratings from another run', async () => {
		const [mine] = await createRunWithResults(1);
		const [theirs] = await createRunWithResults(1);

		await ratingRepository.createRating({ resultId: mine.id, vote: 'up' });
		await ratingRepository.createRating({ resultId: theirs.id, vote: 'down' });

		const latest = await ratingRepository.findLatestByRunId(mine.runId);

		expect(latest).toHaveLength(1);
		expect(latest[0].resultId).toBe(mine.id);
	});

	it('returns nothing for a run with no ratings', async () => {
		const [result] = await createRunWithResults(1);

		await expect(ratingRepository.findLatestByRunId(result.runId)).resolves.toEqual([]);
	});
});
