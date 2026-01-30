import {
	browserApiDataSchema,
	browserApiNotificationSchema,
	browserApiPlaySoundSchema,
} from '../browser-api.schema';

describe('browserApiNotificationSchema', () => {
	it('should accept valid notification payload', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test Title',
				body: 'Test body message',
				icon: 'https://example.com/icon.png',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should accept notification with only required fields', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test Title',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should reject notification with empty title', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: '',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject notification with title exceeding max length', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'a'.repeat(257),
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject notification with body exceeding max length', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test',
				body: 'a'.repeat(1025),
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject notification with non-http/https icon URL', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test',
				icon: 'javascript:alert(1)',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject notification with data: URL icon', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test',
				icon: 'data:text/html,<script>alert(1)</script>',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should accept notification with http icon URL', () => {
		const payload = {
			type: 'notification',
			notification: {
				title: 'Test',
				icon: 'http://example.com/icon.png',
			},
		};

		const result = browserApiNotificationSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});
});

describe('browserApiPlaySoundSchema', () => {
	it('should accept valid playSound payload with preset sound', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'success',
				volume: 0.8,
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should accept playSound with only required fields', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'error',
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should accept custom sound with valid URL', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'custom',
				url: 'https://example.com/sound.mp3',
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should accept custom sound without URL at schema level (validated in union)', () => {
		// Note: The "custom requires URL" validation is done at the browserApiDataSchema level,
		// not at the individual schema level, to work with discriminatedUnion
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'custom',
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('should reject invalid sound type', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'invalid',
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject volume below 0', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'success',
				volume: -0.1,
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject volume above 1', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'success',
				volume: 1.5,
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject custom sound with non-http/https URL', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'custom',
				url: 'file:///etc/passwd',
			},
		};

		const result = browserApiPlaySoundSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should accept all valid sound types', () => {
		const soundTypes = ['success', 'error', 'warning', 'info', 'custom'] as const;

		for (const sound of soundTypes) {
			const payload = {
				type: 'playSound' as const,
				playSound: {
					sound,
					...(sound === 'custom' ? { url: 'https://example.com/sound.mp3' } : {}),
				},
			};

			const result = browserApiPlaySoundSchema.safeParse(payload);
			expect(result.success).toBe(true);
		}
	});
});

describe('browserApiDataSchema (discriminated union)', () => {
	it('should correctly discriminate notification type', () => {
		const payload = {
			type: 'notification',
			notification: { title: 'Test' },
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe('notification');
		}
	});

	it('should correctly discriminate playSound type', () => {
		const payload = {
			type: 'playSound',
			playSound: { sound: 'success' },
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe('playSound');
		}
	});

	it('should reject unknown type', () => {
		const payload = {
			type: 'unknown',
			data: {},
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject payload with mismatched type and data', () => {
		const payload = {
			type: 'notification',
			playSound: { sound: 'success' },
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('should reject completely malformed payload', () => {
		const payloads = [null, undefined, 'string', 123, [], {}];

		for (const payload of payloads) {
			const result = browserApiDataSchema.safeParse(payload);
			expect(result.success).toBe(false);
		}
	});

	it('should reject custom sound without URL', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'custom',
			},
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('URL is required when sound is "custom"');
		}
	});

	it('should accept custom sound with valid URL', () => {
		const payload = {
			type: 'playSound',
			playSound: {
				sound: 'custom',
				url: 'https://example.com/sound.mp3',
			},
		};

		const result = browserApiDataSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});
});
