import { getConfig, mbToBytes, hoursToMs } from '../config';

describe('Vector Store Config', () => {
	// Store original environment
	const originalEnv = { ...process.env };

	// Restore original environment after each test
	afterEach(() => {
		process.env = { ...originalEnv };
	});

	describe('getConfig', () => {
		it('should return default values when no environment variables set', () => {
			// Clear relevant environment variables
			delete process.env.N8N_VECTOR_STORE_MAX_MEMORY;
			delete process.env.N8N_VECTOR_STORE_TTL_HOURS;

			const config = getConfig();

			expect(config.maxMemoryMB).toBe(-1);
			expect(config.ttlHours).toBe(-1);
		});

		it('should use values from environment variables when set', () => {
			process.env.N8N_VECTOR_STORE_MAX_MEMORY = '200';
			process.env.N8N_VECTOR_STORE_TTL_HOURS = '24';

			const config = getConfig();

			expect(config.maxMemoryMB).toBe(200);
			expect(config.ttlHours).toBe(24);
		});

		it('should handle invalid environment variable values', () => {
			// Set invalid values (non-numeric)
			process.env.N8N_VECTOR_STORE_MAX_MEMORY = 'invalid';
			process.env.N8N_VECTOR_STORE_TTL_HOURS = 'notanumber';

			const config = getConfig();

			// Should use default values for invalid inputs
			expect(config.maxMemoryMB).toBe(-1);
			expect(config.ttlHours).toBe(-1);
		});
	});

	describe('mbToBytes', () => {
		it('should convert MB to bytes', () => {
			expect(mbToBytes(1)).toBe(1024 * 1024);
			expect(mbToBytes(5)).toBe(5 * 1024 * 1024);
			expect(mbToBytes(100)).toBe(100 * 1024 * 1024);
		});

		it('should handle zero and negative values', () => {
			expect(mbToBytes(0)).toBe(-1);
			expect(mbToBytes(-1)).toBe(-1);
			expect(mbToBytes(-10)).toBe(-1);
		});
	});

	describe('hoursToMs', () => {
		it('should convert hours to milliseconds', () => {
			expect(hoursToMs(1)).toBe(60 * 60 * 1000);
			expect(hoursToMs(24)).toBe(24 * 60 * 60 * 1000);
			expect(hoursToMs(168)).toBe(168 * 60 * 60 * 1000);
		});

		it('should handle zero and negative values', () => {
			expect(hoursToMs(0)).toBe(-1);
			expect(hoursToMs(-1)).toBe(-1);
			expect(hoursToMs(-24)).toBe(-1);
		});
	});
});
