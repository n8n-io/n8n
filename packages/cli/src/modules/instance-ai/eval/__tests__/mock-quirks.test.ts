import {
	findMockQuirks,
	hostnameMatchesPattern,
	MOCK_QUIRKS,
	quirkMatches,
	type MockQuirk,
} from '../mock-quirks';

describe('quirkMatches', () => {
	const serviceWide: MockQuirk = {
		service: 'Acme',
		guidance: 'service-wide',
		rationale: 'test',
		addedAt: '2026-05-08',
	};

	const endpointSpecific: MockQuirk = {
		service: 'Acme',
		endpoint: 'POST /v1/widgets',
		guidance: 'endpoint-specific',
		rationale: 'test',
		addedAt: '2026-05-08',
	};

	it('returns false when service does not match', () => {
		expect(quirkMatches(serviceWide, 'Other', 'GET', '/anything')).toBe(false);
		expect(quirkMatches(endpointSpecific, 'Other', 'POST', '/v1/widgets')).toBe(false);
	});

	it('returns true for service-wide quirk on any endpoint of that service', () => {
		expect(quirkMatches(serviceWide, 'Acme', 'GET', '/v1/foo')).toBe(true);
		expect(quirkMatches(serviceWide, 'Acme', 'POST', '/v2/bar/baz')).toBe(true);
		expect(quirkMatches(serviceWide, 'Acme', 'DELETE', '/')).toBe(true);
	});

	it('returns true for endpoint-specific quirk on exact match', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'POST', '/v1/widgets')).toBe(true);
	});

	it('returns false for endpoint-specific quirk on different endpoint', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'POST', '/v1/other')).toBe(false);
		expect(quirkMatches(endpointSpecific, 'Acme', 'GET', '/v1/widgets')).toBe(false);
	});

	it('matches method case-insensitively', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'post', '/v1/widgets')).toBe(true);
		expect(quirkMatches(endpointSpecific, 'Acme', 'Post', '/v1/widgets')).toBe(true);
	});
});

describe('findMockQuirks (real registry)', () => {
	it('returns the Notion guidance for any Notion request', () => {
		const guidance = findMockQuirks('Notion', 'POST', '/v1/pages');
		expect(guidance.length).toBeGreaterThan(0);
		expect(guidance[0]).toMatch(/full|FULL/);
	});

	it('returns the same guidance regardless of which Notion endpoint is hit', () => {
		const pageGuidance = findMockQuirks('Notion', 'POST', '/v1/pages');
		const dbGuidance = findMockQuirks('Notion', 'GET', '/v1/databases/abc');
		const blockGuidance = findMockQuirks('Notion', 'PATCH', '/v1/blocks/xyz');
		expect(pageGuidance).toEqual(dbGuidance);
		expect(pageGuidance).toEqual(blockGuidance);
	});

	it('returns empty array for services with no quirks registered', () => {
		expect(findMockQuirks('GitHub', 'GET', '/repos/owner/name/issues')).toEqual([]);
		expect(findMockQuirks('Stripe', 'POST', '/v1/charges')).toEqual([]);
	});

	describe('binary / file quirks', () => {
		it('returns Telegram guidance that documents both bot-API and file-CDN shapes', () => {
			const guidance = findMockQuirks('Telegram', 'GET', '/bot123/getFile');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/\/bot\{token\}/);
			expect(guidance.join('\n')).toMatch(/\/file\/bot/);
			expect(guidance.join('\n')).toMatch(/\.ogg/);
		});

		it('returns Openai guidance that mentions transcriptions and image generations', () => {
			const guidance = findMockQuirks('Openai', 'POST', '/v1/audio/transcriptions');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/transcriptions/);
			expect(guidance.join('\n')).toMatch(/images\/generations/);
		});

		it('returns Googleapis guidance that names alt=media as the binary marker', () => {
			const guidance = findMockQuirks('Googleapis', 'GET', '/drive/v3/files/abc');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/alt=media/);
		});

		it('returns Slack guidance that steers AWAY from binary for files endpoints', () => {
			const guidance = findMockQuirks('Slack', 'POST', '/api/files.upload');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/NEVER pick `type: "binary"`/);
		});

		it('returns Slack guidance that disambiguates singular `file` vs plural `files[]` per endpoint', () => {
			const guidance = findMockQuirks('Slack', 'POST', '/api/files.completeUploadExternal');
			const joined = guidance.join('\n');
			// completeUploadExternal returns the plural array — the Slack v2.4 node reads files[0].
			expect(joined).toMatch(/files\.completeUploadExternal[\s\S]*plural `files` array/);
			// files.info / files.upload use the singular envelope.
			expect(joined).toMatch(/files\.info[\s\S]*singular/);
		});

		it('returns S3 guidance distinguishing GetObject from PutObject', () => {
			const guidance = findMockQuirks('S3', 'GET', '/some-key.pdf');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/GetObject/);
			expect(guidance.join('\n')).toMatch(/PutObject/);
		});

		it('returns Slack guidance for files.slack.com despite the service name resolving to "Files"', () => {
			// `files.slack.com` is the destination of the three-step upload PUT.
			// Service extraction yields "Files" (first label of the hostname);
			// the hostname pattern must rescue the match.
			const guidance = findMockQuirks('Files', 'PUT', '/upload/v1/abc123', 'files.slack.com');
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/NEVER pick `type: "binary"`/);
		});

		it('returns S3 guidance for virtual-hosted bucket URLs (`<bucket>.s3.amazonaws.com`)', () => {
			const guidance = findMockQuirks(
				'My-bucket',
				'GET',
				'/some-key.pdf',
				'my-bucket.s3.amazonaws.com',
			);
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/GetObject/);
		});

		it('returns S3 guidance for regional bucket URLs (`<bucket>.s3.<region>.amazonaws.com`)', () => {
			const guidance = findMockQuirks(
				'My-bucket',
				'GET',
				'/file.png',
				'my-bucket.s3.us-east-1.amazonaws.com',
			);
			expect(guidance.length).toBeGreaterThan(0);
			expect(guidance.join('\n')).toMatch(/GetObject/);
		});

		it('still returns no guidance when neither service nor hostname matches', () => {
			expect(findMockQuirks('Files', 'PUT', '/x', 'files.example.com')).toEqual([]);
			expect(findMockQuirks('My-bucket', 'GET', '/x', 'my-bucket.example.com')).toEqual([]);
		});
	});

	it('is case-sensitive on service name (extractServiceName produces capitalized form)', () => {
		expect(findMockQuirks('notion', 'POST', '/v1/pages')).toEqual([]);
		expect(findMockQuirks('NOTION', 'POST', '/v1/pages')).toEqual([]);
	});
});

describe('hostnameMatchesPattern', () => {
	it('matches exact hostnames', () => {
		expect(hostnameMatchesPattern('s3.amazonaws.com', 's3.amazonaws.com')).toBe(true);
		expect(hostnameMatchesPattern('s3.amazonaws.com', 's3.us-east-1.amazonaws.com')).toBe(false);
	});

	it('treats `*` as a single DNS label wildcard (no dots)', () => {
		expect(hostnameMatchesPattern('*.slack.com', 'files.slack.com')).toBe(true);
		expect(hostnameMatchesPattern('*.slack.com', 'api.slack.com')).toBe(true);
		expect(hostnameMatchesPattern('*.slack.com', 'slack.com')).toBe(false);
		expect(hostnameMatchesPattern('*.slack.com', 'a.b.slack.com')).toBe(false);
	});

	it('supports multiple wildcards in one pattern', () => {
		expect(
			hostnameMatchesPattern('*.s3.*.amazonaws.com', 'my-bucket.s3.us-east-1.amazonaws.com'),
		).toBe(true);
		expect(hostnameMatchesPattern('*.s3.*.amazonaws.com', 'my-bucket.s3.amazonaws.com')).toBe(
			false,
		);
	});

	it('escapes regex metachars in literal parts of the pattern', () => {
		expect(hostnameMatchesPattern('host-1.example.com', 'host-1.example.com')).toBe(true);
		expect(hostnameMatchesPattern('host-1.example.com', 'hostX1.example.com')).toBe(false);
	});
});

describe('MOCK_QUIRKS registry shape', () => {
	it('every entry has the required fields', () => {
		for (const quirk of MOCK_QUIRKS) {
			expect(quirk.service).toMatch(/^[A-Z]/);
			expect(quirk.guidance.length).toBeGreaterThan(0);
			expect(quirk.rationale.length).toBeGreaterThan(0);
			expect(quirk.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			if (quirk.endpoint !== undefined) {
				expect(quirk.endpoint).toMatch(/^(GET|POST|PUT|PATCH|DELETE) \//);
			}
		}
	});
});
