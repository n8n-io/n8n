import { UpdateMigrationFindingStatusesRequestDto } from '../update-migration-finding-statuses-request.dto';

describe('UpdateMigrationFindingStatusesRequestDto', () => {
	test.each(['open', 'wont_fix'])('should accept the status %s', (status) => {
		expect(
			UpdateMigrationFindingStatusesRequestDto.safeParse({ workflowIds: ['wf-1', 'wf-2'], status })
				.success,
		).toBe(true);
	});

	test.each([
		{
			name: 'a status that only the scan sets',
			request: { workflowIds: ['wf-1'], status: 'fixed' },
		},
		{ name: 'an empty workflow list', request: { workflowIds: [], status: 'wont_fix' } },
		{ name: 'an empty workflow id', request: { workflowIds: [''], status: 'wont_fix' } },
		{ name: 'a missing workflow list', request: { status: 'wont_fix' } },
		{ name: 'a missing status', request: { workflowIds: ['wf-1'] } },
	])('should reject $name', ({ request }) => {
		expect(UpdateMigrationFindingStatusesRequestDto.safeParse(request).success).toBe(false);
	});
});
