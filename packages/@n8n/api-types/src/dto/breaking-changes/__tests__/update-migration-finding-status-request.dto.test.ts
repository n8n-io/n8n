import { UpdateMigrationFindingStatusRequestDto } from '../update-migration-finding-status-request.dto';

describe('UpdateMigrationFindingStatusRequestDto', () => {
	test.each(['open', 'wont_fix'])('should accept the status %s', (status) => {
		expect(UpdateMigrationFindingStatusRequestDto.safeParse({ status }).success).toBe(true);
	});

	test.each([
		{ name: 'a status that only the scan sets', request: { status: 'fixed' } },
		{ name: 'a status that only notifications set', request: { status: 'notified' } },
		{ name: 'an unknown status', request: { status: 'closed' } },
		{ name: 'a missing status', request: {} },
	])('should reject $name', ({ request }) => {
		expect(UpdateMigrationFindingStatusRequestDto.safeParse(request).success).toBe(false);
	});
});
