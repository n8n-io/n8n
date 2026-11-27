import { CreateProjectPolicyDto } from '../create-project-policy.dto';

describe('CreateProjectPolicyDto', () => {
	it('accepts a project ID', () => {
		expect(CreateProjectPolicyDto.safeParse({ projectId: 'abc123' }).success).toBe(true);
	});

	it('rejects a missing project ID', () => {
		expect(CreateProjectPolicyDto.safeParse({}).success).toBe(false);
	});

	it('rejects an empty project ID', () => {
		expect(CreateProjectPolicyDto.safeParse({ projectId: '' }).success).toBe(false);
	});
});
