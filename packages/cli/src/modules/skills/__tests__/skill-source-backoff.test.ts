import { skillSourceBackoffSeconds } from '../utils/skill-source-backoff';

describe('skillSourceBackoffSeconds', () => {
	it.each([
		[1, 60],
		[2, 120],
		[3, 240],
		[7, 3840],
		[10, 21600],
		[10000, 21600],
	])('backs off for attempt %s, up to six hours', (attempt, seconds) => {
		expect(skillSourceBackoffSeconds(attempt, 0, 0)).toBe(seconds);
	});

	it('honors a server wait longer than the local cap', () => {
		expect(skillSourceBackoffSeconds(10, 86400, 0.5)).toBe(86430);
	});

	it('keeps the backoff when the server asks for a shorter wait', () => {
		expect(skillSourceBackoffSeconds(3, 1, 0)).toBe(240);
	});

	it.each([0, 0.5, 0.999])('adds jitter after the minimum wait (%s)', (random) => {
		expect(skillSourceBackoffSeconds(1, 0, random)).toBe(60 + random * 15);
		expect(skillSourceBackoffSeconds(10, 0, random)).toBe(21600 + random * 60);
	});
});
