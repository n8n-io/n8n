import { NotifyMigrationOwnersRequestDto } from '../notify-migration-owners-request.dto';

describe('NotifyMigrationOwnersRequestDto', () => {
	it('should accept a list of workflow ids', () => {
		expect(
			NotifyMigrationOwnersRequestDto.safeParse({ workflowIds: ['wf-1', 'wf-2'] }).success,
		).toBe(true);
	});

	test.each([
		{ name: 'an empty workflow list', request: { workflowIds: [] } },
		{ name: 'an empty workflow id', request: { workflowIds: [''] } },
		{ name: 'a missing workflow list', request: {} },
	])('should reject $name', ({ request }) => {
		expect(NotifyMigrationOwnersRequestDto.safeParse(request).success).toBe(false);
	});
});
