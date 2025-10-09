import type { ChatHubConversation } from '@n8n/api-types';
import { getRelativeDate, groupConversationsByDate } from './chat.utils';

describe(getRelativeDate, () => {
	const mockNow = new Date('2025-10-09T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(mockNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return "Today" for today\'s date', () => {
		const today = new Date('2025-10-09T08:00:00Z').toISOString();
		expect(getRelativeDate(today)).toBe('Today');
	});

	it('should return "Today" for a date later today', () => {
		const laterToday = new Date('2025-10-09T18:00:00Z').toISOString();
		expect(getRelativeDate(laterToday)).toBe('Today');
	});

	it('should return "Yesterday" for yesterday\'s date', () => {
		const yesterday = new Date('2025-10-08T12:00:00Z').toISOString();
		expect(getRelativeDate(yesterday)).toBe('Yesterday');
	});

	it('should return "This week" for a date 3 days ago', () => {
		const threeDaysAgo = new Date('2025-10-06T12:00:00Z').toISOString();
		expect(getRelativeDate(threeDaysAgo)).toBe('This week');
	});

	it('should return "This week" for a date 6 days ago', () => {
		const sixDaysAgo = new Date('2025-10-03T12:00:00Z').toISOString();
		expect(getRelativeDate(sixDaysAgo)).toBe('This week');
	});

	it('should return "Older" for a date 8 days ago', () => {
		const eightDaysAgo = new Date('2025-10-01T12:00:00Z').toISOString();
		expect(getRelativeDate(eightDaysAgo)).toBe('Older');
	});

	it('should return "Older" for a date 30 days ago', () => {
		const thirtyDaysAgo = new Date('2025-09-09T12:00:00Z').toISOString();
		expect(getRelativeDate(thirtyDaysAgo)).toBe('Older');
	});

	it('should return "Older" for a date 1 year ago', () => {
		const oneYearAgo = new Date('2024-10-09T12:00:00Z').toISOString();
		expect(getRelativeDate(oneYearAgo)).toBe('Older');
	});

	it('should handle date strings with different timezones', () => {
		const todayDifferentTimezone = new Date('2025-10-09T23:59:59+09:00').toISOString();
		expect(getRelativeDate(todayDifferentTimezone)).toBe('Today');
	});
});

describe(groupConversationsByDate, () => {
	const mockNow = new Date('2025-10-09T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(mockNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return empty array for empty sessions', () => {
		expect(groupConversationsByDate([])).toEqual([]);
	});

	it('should group a single conversation correctly', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'session-1',
				title: 'Test Session',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		expect(result).toEqual([
			{
				group: 'Today',
				sessions: [
					{
						id: 'session-1',
						label: 'Test Session',
					},
				],
			},
		]);
	});

	it('should group multiple conversations by date', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'session-1',
				title: 'Today Session',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
			{
				id: 'session-2',
				title: 'Yesterday Session',
				createdAt: new Date('2025-10-08T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-08T10:00:00Z').toISOString(),
			},
			{
				id: 'session-3',
				title: 'This Week Session',
				createdAt: new Date('2025-10-05T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-05T10:00:00Z').toISOString(),
			},
			{
				id: 'session-4',
				title: 'Older Session',
				createdAt: new Date('2025-09-01T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-09-01T10:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		expect(result).toEqual([
			{
				group: 'Today',
				sessions: [
					{
						id: 'session-1',
						label: 'Today Session',
					},
				],
			},
			{
				group: 'Yesterday',
				sessions: [
					{
						id: 'session-2',
						label: 'Yesterday Session',
					},
				],
			},
			{
				group: 'This week',
				sessions: [
					{
						id: 'session-3',
						label: 'This Week Session',
					},
				],
			},
			{
				group: 'Older',
				sessions: [
					{
						id: 'session-4',
						label: 'Older Session',
					},
				],
			},
		]);
	});

	it('should group multiple conversations in the same group', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'session-1',
				title: 'First Today Session',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
			{
				id: 'session-2',
				title: 'Second Today Session',
				createdAt: new Date('2025-10-09T14:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T14:00:00Z').toISOString(),
			},
			{
				id: 'session-3',
				title: 'Third Today Session',
				createdAt: new Date('2025-10-09T18:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T18:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		expect(result).toEqual([
			{
				group: 'Today',
				sessions: [
					{
						id: 'session-1',
						label: 'First Today Session',
					},
					{
						id: 'session-2',
						label: 'Second Today Session',
					},
					{
						id: 'session-3',
						label: 'Third Today Session',
					},
				],
			},
		]);
	});

	it('should maintain group order even if sessions are not sorted', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'session-4',
				title: 'Older Session',
				createdAt: new Date('2025-09-01T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-09-01T10:00:00Z').toISOString(),
			},
			{
				id: 'session-1',
				title: 'Today Session',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
			{
				id: 'session-3',
				title: 'This Week Session',
				createdAt: new Date('2025-10-05T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-05T10:00:00Z').toISOString(),
			},
			{
				id: 'session-2',
				title: 'Yesterday Session',
				createdAt: new Date('2025-10-08T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-08T10:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		// Verify the order is: Today, Yesterday, This week, Older
		expect(result.map((group) => group.group)).toEqual([
			'Today',
			'Yesterday',
			'This week',
			'Older',
		]);
	});

	it('should skip groups with no sessions', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'session-1',
				title: 'Today Session',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
			{
				id: 'session-2',
				title: 'Older Session',
				createdAt: new Date('2025-09-01T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-09-01T10:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		// Should only have Today and Older groups, skipping Yesterday and This week
		expect(result).toEqual([
			{
				group: 'Today',
				sessions: [
					{
						id: 'session-1',
						label: 'Today Session',
					},
				],
			},
			{
				group: 'Older',
				sessions: [
					{
						id: 'session-2',
						label: 'Older Session',
					},
				],
			},
		]);
	});

	it('should map session properties correctly (id and title to label)', () => {
		const sessions: ChatHubConversation[] = [
			{
				id: 'abc-123',
				title: 'My Awesome Chat',
				createdAt: new Date('2025-10-09T10:00:00Z').toISOString(),
				updatedAt: new Date('2025-10-09T10:00:00Z').toISOString(),
			},
		];

		const result = groupConversationsByDate(sessions);

		expect(result[0].sessions[0]).toEqual({
			id: 'abc-123',
			label: 'My Awesome Chat',
		});
	});
});
