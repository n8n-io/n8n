import { UpdatePublicApiRateLimitSettingsDto } from '../update-public-api-rate-limit-settings.dto';

const validSettings = {
	enabled: true,
	globalReadLimit: 100,
	globalReadWindowSeconds: 60,
	globalWriteLimit: 50,
	globalWriteWindowSeconds: 60,
	endpointReadLimit: 20,
	endpointReadWindowSeconds: 60,
	endpointWriteLimit: 0,
	endpointWriteWindowSeconds: 60,
};

describe('UpdatePublicApiRateLimitSettingsDto', () => {
	it('accepts valid settings, with 0 as no limit', () => {
		expect(UpdatePublicApiRateLimitSettingsDto.safeParse(validSettings).success).toBe(true);
	});

	it('requires every field', () => {
		const result = UpdatePublicApiRateLimitSettingsDto.safeParse({});

		assert(!result.success);
		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(Object.keys(validSettings).sort());
	});

	it.each([
		{ field: 'globalReadLimit', value: -1 },
		{ field: 'globalReadLimit', value: 1.5 },
		{ field: 'globalReadLimit', value: '10' },
		{ field: 'globalReadWindowSeconds', value: 0 },
		{ field: 'globalReadWindowSeconds', value: 2.5 },
		{ field: 'enabled', value: 'true' },
	])('rejects $value for $field', ({ field, value }) => {
		const result = UpdatePublicApiRateLimitSettingsDto.safeParse({
			...validSettings,
			[field]: value,
		});

		expect(result.success).toBe(false);
	});
});
