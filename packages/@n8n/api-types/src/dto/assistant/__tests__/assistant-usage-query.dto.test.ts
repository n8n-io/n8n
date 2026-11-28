import { AssistantUsageQueryDto, AssistantUsageUsersQueryDto } from '../assistant-usage-query.dto';

describe('AssistantUsageQueryDto', () => {
	it('reads the dates of the range from the query string', () => {
		const result = AssistantUsageQueryDto.safeParse({
			startDate: '2026-11-01T00:00:00.000Z',
			endDate: '2026-11-30T23:59:59.999Z',
			timeZone: 'Europe/Berlin',
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			startDate: new Date('2026-11-01T00:00:00.000Z'),
			endDate: new Date('2026-11-30T23:59:59.999Z'),
			timeZone: 'Europe/Berlin',
		});
	});

	it('refuses an invalid date', () => {
		const result = AssistantUsageQueryDto.safeParse({
			startDate: 'yesterday',
			endDate: '2026-11-30T00:00:00.000Z',
		});

		expect(result.success).toBe(false);
	});

	it('drops an unknown time zone, so the days fall back to UTC', () => {
		const result = AssistantUsageQueryDto.safeParse({
			startDate: '2026-11-01T00:00:00.000Z',
			endDate: '2026-11-30T00:00:00.000Z',
			timeZone: 'Mars/Olympus',
		});

		expect(result.success).toBe(true);
		expect(result.data?.timeZone).toBeUndefined();
	});
});

describe('AssistantUsageUsersQueryDto', () => {
	const range = { startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-11-30T00:00:00.000Z' };

	it('reads the page and the sort from the query string', () => {
		const result = AssistantUsageUsersQueryDto.safeParse({
			...range,
			skip: '20',
			take: '10',
			sortBy: 'tokens:desc',
		});

		expect(result.data).toMatchObject({ skip: 20, take: 10, sortBy: 'tokens:desc' });
	});

	it('refuses an unknown sort', () => {
		const result = AssistantUsageUsersQueryDto.safeParse({ ...range, sortBy: 'email:asc' });

		expect(result.success).toBe(false);
	});

	it('limits a page to 100 users', () => {
		const result = AssistantUsageUsersQueryDto.safeParse({ ...range, take: '500' });

		expect(result.data?.take).toBe(100);
	});
});
