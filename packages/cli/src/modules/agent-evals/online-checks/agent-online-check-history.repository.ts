import type {
	AgentOnlineCase,
	AgentOnlineCaseResult,
	AgentOnlineRubric,
	AgentOnlineResultPage,
	AgentOnlineVerdict,
} from '@n8n/api-types';
import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, In } from '@n8n/typeorm';
import { AgentOnlineCheckCase } from './agent-online-check-case.entity';
import { AgentOnlineCheckResult } from './agent-online-check-result.entity';
import { AgentOnlineCheckReview } from './agent-online-check-review.entity';
import type { ChatTurn } from './types';

class CaseTable extends BaseRepository<AgentOnlineCheckCase> {
	constructor(ds: DataSource, tx: TransactionRunner) {
		super(AgentOnlineCheckCase, ds.manager, tx);
	}
}
class ResultTable extends BaseRepository<AgentOnlineCheckResult> {
	constructor(ds: DataSource, tx: TransactionRunner) {
		super(AgentOnlineCheckResult, ds.manager, tx);
	}
}
class ReviewTable extends BaseRepository<AgentOnlineCheckReview> {
	constructor(ds: DataSource, tx: TransactionRunner) {
		super(AgentOnlineCheckReview, ds.manager, tx);
	}
}
const resultRecord = (row: AgentOnlineCheckResult): AgentOnlineCaseResult => ({
	id: row.id,
	caseId: row.caseId,
	checkedAt: row.createdAt.toISOString(),
	rubric: row.rubric,
	configHash: row.configHash,
	verdicts: row.verdicts,
});

function resultStatus(verdicts: AgentOnlineVerdict[]): 'good' | 'bad' | 'review' {
	if (verdicts.some((verdict) => verdict.status === 'fail')) return 'bad';
	if (
		verdicts.some((verdict) => verdict.status === 'unsure' || verdict.status === 'not_run') ||
		!verdicts.some((verdict) => verdict.status === 'pass')
	)
		return 'review';
	return 'good';
}

@Service()
export class AgentOnlineCheckHistoryRepository {
	private readonly cases: CaseTable;
	private readonly results: ResultTable;
	private readonly reviews: ReviewTable;
	constructor(
		ds: DataSource,
		private readonly tx: TransactionRunner,
	) {
		this.cases = new CaseTable(ds, tx);
		this.results = new ResultTable(ds, tx);
		this.reviews = new ReviewTable(ds, tx);
	}
	async findCase(agentId: string, caseId: number, userId: string) {
		return await this.cases.managerFor({}).findOneBy(AgentOnlineCheckCase, [
			{ id: caseId, agentId, ownerId: IsNull() },
			{ id: caseId, agentId, ownerId: userId },
		]);
	}
	async findSessionCase(agentId: string, threadId: string, userId: string) {
		return await this.cases.managerFor({}).findOneBy(AgentOnlineCheckCase, [
			{ agentId, threadId, ownerId: IsNull() },
			{ agentId, threadId, ownerId: userId },
		]);
	}
	async saveAssessment(input: {
		agentId: string;
		ownerId: string | null;
		threadId: string;
		title: string;
		turns: ChatTurn[];
		rubric: AgentOnlineRubric;
		configHash: string;
		verdicts: AgentOnlineVerdict[];
		caseId?: number;
	}) {
		return await this.tx.run({}, async (ctx) => {
			const manager = this.cases.managerFor(ctx);
			if (input.caseId === undefined) {
				await manager
					.createQueryBuilder()
					.insert()
					.into(AgentOnlineCheckCase)
					.values({
						agentId: input.agentId,
						ownerId: input.ownerId,
						threadId: input.threadId,
						title: input.title,
						turns: () => ':turns',
					})
					.setParameter('turns', JSON.stringify(input.turns))
					.orIgnore()
					.execute();
			}
			const testCase = await manager.findOneByOrFail(
				AgentOnlineCheckCase,
				input.caseId === undefined
					? { agentId: input.agentId, threadId: input.threadId }
					: { agentId: input.agentId, id: input.caseId },
			);
			const result = await this.results.managerFor(ctx).save(
				AgentOnlineCheckResult,
				this.results.create({
					caseId: testCase.id,
					rubric: input.rubric,
					configHash: input.configHash,
					verdicts: input.verdicts,
				}),
			);
			return resultRecord(result);
		});
	}
	async listCases(agentId: string, userId: string, take: number, skip: number) {
		const rows = await this.cases.managerFor({}).find(AgentOnlineCheckCase, {
			where: [
				{ agentId, ownerId: IsNull() },
				{ agentId, ownerId: userId },
			],
			order: { id: 'DESC' },
			take: take + 1,
			skip,
			select: ['id', 'title', 'threadId', 'createdAt'],
		});
		const page = rows.slice(0, take);
		const recentRows =
			page.length === 0
				? []
				: await this.results
						.managerFor({})
						.createQueryBuilder(AgentOnlineCheckResult, 'result')
						.where('result.caseId IN (:...caseIds)', { caseIds: page.map((row) => row.id) })
						.andWhere((query) => {
							const recent = query
								.subQuery()
								.select('assessment.id')
								.from(AgentOnlineCheckResult, 'assessment')
								.where('assessment.caseId = result.caseId')
								.orderBy('assessment.id', 'DESC')
								.limit(5)
								.getQuery();
							return `result.id IN ${recent}`;
						})
						.orderBy('result.id', 'DESC')
						.getMany();
		const items: AgentOnlineCase[] = page.map((row) => {
			const recent = recentRows.filter((result) => result.caseId === row.id);
			return {
				id: row.id,
				title: row.title,
				threadId: row.threadId,
				createdAt: row.createdAt.toISOString(),
				latestResult: recent[0] ? resultRecord(recent[0]) : null,
				recentResults: recent.toReversed().map((result) => ({
					id: result.id,
					checkedAt: result.createdAt.toISOString(),
					status: resultStatus(result.verdicts),
				})),
			};
		});
		return { items, hasMore: rows.length > take };
	}
	async listResults(
		agentId: string,
		caseId: number,
		userId: string,
		take: number,
		skip: number,
	): Promise<AgentOnlineResultPage | null> {
		const testCase = await this.findCase(agentId, caseId, userId);
		if (!testCase) return null;
		const rows = await this.results.managerFor({}).find(AgentOnlineCheckResult, {
			where: { caseId },
			order: { id: 'DESC' },
			take: take + 1,
			skip,
		});
		return {
			items: await this.withReviews(rows.slice(0, take), userId),
			hasMore: rows.length > take,
			conversation: testCase.turns.map(({ userMessage, reply }) => ({ userMessage, reply })),
		};
	}
	async listActivity(agentId: string, userId: string, take: number, skip: number) {
		const rows = await this.results
			.managerFor({})
			.createQueryBuilder(AgentOnlineCheckResult, 'result')
			.innerJoin('result.testCase', 'testCase')
			.addSelect(['testCase.id', 'testCase.title'])
			.where('testCase.agentId = :agentId', { agentId })
			.andWhere('(testCase.ownerId IS NULL OR testCase.ownerId = :userId)', { userId })
			.orderBy('result.id', 'DESC')
			.take(take + 1)
			.skip(skip)
			.getMany();
		const page = rows.slice(0, take);
		const records = await this.withReviews(page, userId);
		return {
			items: page.map((row, index) => ({
				caseId: row.caseId,
				title: row.testCase.title,
				result: records[index],
			})),
			hasMore: rows.length > take,
		};
	}
	async findAssessment(agentId: string, userId: string, resultId: number) {
		const result = await this.results
			.managerFor({})
			.findOneBy(AgentOnlineCheckResult, { id: resultId });
		if (!result || !(await this.findCase(agentId, result.caseId, userId))) return null;
		return resultRecord(result);
	}
	async recordReview(resultId: number, userId: string, checkId: string, feedback: 'good' | 'bad') {
		await this.reviews
			.managerFor({})
			.save(AgentOnlineCheckReview, this.reviews.create({ resultId, userId, checkId, feedback }));
		return { checkId, feedback };
	}
	private async withReviews(rows: AgentOnlineCheckResult[], userId: string) {
		if (rows.length === 0) return [];
		const reviews = await this.reviews.managerFor({}).find(AgentOnlineCheckReview, {
			where: { userId, resultId: In(rows.map((row) => row.id)) },
			order: { id: 'ASC' },
		});
		return rows.map((row) => {
			const feedback: Record<string, 'good' | 'bad'> = {};
			for (const review of reviews)
				if (review.resultId === row.id) feedback[review.checkId] = review.feedback;
			return { ...resultRecord(row), reviews: feedback };
		});
	}
}
