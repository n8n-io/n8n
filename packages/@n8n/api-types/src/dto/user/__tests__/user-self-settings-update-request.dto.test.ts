import { UserSelfSettingsUpdateRequestDto } from '../user-self-settings-update-request.dto';

describe('UserSelfSettingsUpdateRequestDto', () => {
	describe('valid payloads', () => {
		it('should pass validation with empty object', () => {
			const data = {};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('should pass validation with easyAIWorkflowOnboarded', () => {
			const data = {
				easyAIWorkflowOnboarded: true,
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('should pass validation with dismissedCallouts', () => {
			const data = {
				dismissedCallouts: {
					'some-callout': true,
					'another-callout': false,
				},
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('should pass validation with all allowed fields', () => {
			const data = {
				easyAIWorkflowOnboarded: false,
				dismissedCallouts: { 'test-callout': true },
				mcpJsonNudge: { impressions: 1 },
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('should pass validation with mcpJsonNudge', () => {
			const data = {
				mcpJsonNudge: { impressions: 2 },
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		});
	});

	describe('invalid payloads', () => {
		it('should fail validation with invalid easyAIWorkflowOnboarded type', () => {
			const data = {
				easyAIWorkflowOnboarded: 'invalid',
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe('easyAIWorkflowOnboarded');
			expect(result.error?.issues[0].message).toBe('Expected boolean, received string');
		});

		it('should fail validation with invalid dismissedCallouts type', () => {
			const data = {
				dismissedCallouts: 'invalid',
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe('dismissedCallouts');
		});

		it('should fail validation with invalid dismissedCallouts value type', () => {
			const data = {
				dismissedCallouts: {
					'some-callout': 'not-a-boolean',
				},
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['dismissedCallouts', 'some-callout']);
		});

		it('should fail validation with invalid mcpJsonNudge type', () => {
			const data = {
				mcpJsonNudge: 'invalid',
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe('mcpJsonNudge');
		});

		it('should fail validation with invalid mcpJsonNudge.impressions type', () => {
			const data = {
				mcpJsonNudge: { impressions: 'invalid' },
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['mcpJsonNudge', 'impressions']);
		});

		it.each([
			['a negative count', -1],
			['a fractional count', 1.5],
		])('should fail validation with %s for mcpJsonNudge.impressions', (_label, impressions) => {
			const data = {
				mcpJsonNudge: { impressions },
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['mcpJsonNudge', 'impressions']);
		});
	});

	describe('security: restricted fields should be stripped', () => {
		it('should strip allowSSOManualLogin from payload', () => {
			const data = {
				easyAIWorkflowOnboarded: true,
				allowSSOManualLogin: true,
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('allowSSOManualLogin');
				expect(result.data.easyAIWorkflowOnboarded).toBe(true);
			}
		});

		it('should strip userActivated from payload (backend-only field)', () => {
			const data = {
				easyAIWorkflowOnboarded: true,
				userActivated: true,
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('userActivated');
				expect(result.data.easyAIWorkflowOnboarded).toBe(true);
			}
		});

		it('should strip unknown fields from payload', () => {
			const data = {
				easyAIWorkflowOnboarded: true,
				someUnknownField: 'value',
			};

			const result = UserSelfSettingsUpdateRequestDto.safeParse(data);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('someUnknownField');
				expect(result.data.easyAIWorkflowOnboarded).toBe(true);
			}
		});
	});
});
