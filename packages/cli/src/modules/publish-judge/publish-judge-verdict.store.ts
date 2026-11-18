import { CacheService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

export type PublishJudgeVerdict = {
	allow: boolean;
	reason: string;
	/** Set when the judge ran as a workflow execution. */
	executionId?: string;
	/** Set when the judge ran as an agent session. */
	sessionId?: string;
	/** The judge gave no answer and the admin chose to block. Stored for a short time only. */
	unavailable?: true;
};

export type VerdictKey = {
	/** Id of the workflow or the agent that was reviewed. */
	subjectId: string;
	/** The version id for a publish. A hash of the content for a save, which has no version yet. */
	versionId: string;
	/** Changes when the judge changes, so an edited judge never reuses an old answer. */
	judgeVersionId: string;
};

const TTL_MS = 7 * Time.days.toMilliseconds;

/** Prototype store. The shared cache keeps every main on one answer; the feature needs a table. */
@Service()
export class PublishJudgeVerdictStore {
	constructor(private readonly cacheService: CacheService) {}

	async get(key: VerdictKey): Promise<PublishJudgeVerdict | undefined> {
		return await this.cacheService.get<PublishJudgeVerdict>(this.cacheKey(key));
	}

	async set(key: VerdictKey, verdict: PublishJudgeVerdict, ttlMs = TTL_MS): Promise<void> {
		await this.cacheService.set(this.cacheKey(key), verdict, ttlMs);
	}

	private cacheKey({ subjectId, versionId, judgeVersionId }: VerdictKey) {
		return `publish-judge:verdict:${subjectId}:${versionId}:${judgeVersionId}`;
	}
}
