describe('userManagement.jwtRefreshTimeoutHours', () => {
	it("resets jwtRefreshTimeoutHours to 0 if it's greater than or equal to jwtSessionDurationHours", async () => {
		process.env.N8N_USER_MANAGEMENT_JWT_DURATION_HOURS = '1';
		process.env.N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS = '1';
		const { default: config } = await import('@/config');

		expect(config.getEnv('userManagement.jwtRefreshTimeoutHours')).toBe(0);
	});
});
