import { parsePromotionRunDetails, promotionRunTypeSchema } from '../promotion-run.dto';
import { parseRemoteReviewId } from '../promotion-review.dto';

const gitDetails = {
	schemaVersion: 1 as const,
	branchName: 'n8n-promotion/1',
	commitSha: 'a'.repeat(40),
};

describe('promotion run details', () => {
	it('accepts a git payload for the git run type', () => {
		expect(parsePromotionRunDetails('git', gitDetails)).toEqual(gitDetails);
		expect(promotionRunTypeSchema.safeParse('gitlab').success).toBe(false);
	});

	it('rejects a git payload with another schema version', () => {
		expect(() => parsePromotionRunDetails('git', { ...gitDetails, schemaVersion: 2 })).toThrow();
	});
});

describe('promotion review host reference', () => {
	it('accepts a GitLab project id and iid', () => {
		expect(parseRemoteReviewId('gitlab', '42!7')).toBe('42!7');
	});

	it('rejects a GitLab reference that still has a host prefix', () => {
		expect(() => parseRemoteReviewId('gitlab', 'gitlab:42!7')).toThrow();
	});
});
