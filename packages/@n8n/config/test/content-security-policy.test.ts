import {
	contentSecurityPolicyReportOnlySchema,
	contentSecurityPolicySchema,
	DEFAULT_CONTENT_SECURITY_POLICY,
} from '../src/configs/content-security-policy';

/** The policy a value parses to, failing the test if it does not parse at all. */
const parse = (value: string) => {
	const result = contentSecurityPolicySchema.safeParse(value);
	if (!result.success) {
		throw new Error(`"${value}" did not parse: ${result.error.issues[0].message}`);
	}
	return result.data;
};

/** Why a value does not parse, or `undefined` if it does. */
const rejectionOf = (value: string) => {
	const result = contentSecurityPolicySchema.safeParse(value);
	return result.success ? undefined : result.error.issues[0].message;
};

const parseReportOnly = (value: string) => {
	const result = contentSecurityPolicyReportOnlySchema.safeParse(value);
	if (!result.success) {
		throw new Error(`"${value}" did not parse: ${result.error.issues[0].message}`);
	}
	return result.data;
};

describe('contentSecurityPolicySchema', () => {
	test.each([
		['empty', ''],
		['whitespace', '   '],
		['empty directives object', '{}'],
	])('should send no header for %s', (_name, value) => {
		expect(parse(value)).toBeUndefined();
	});

	describe('the default-policy keyword', () => {
		it.each(['default', 'DEFAULT', ' Default '])('should accept "%s"', (value) => {
			expect(parse(value)).toBe(DEFAULT_CONTENT_SECURITY_POLICY);
		});
	});

	describe('helmet.js directives object', () => {
		it('should serialize directives the way helmet.js does', () => {
			expect(parse('{"frame-ancestors":["http://localhost:3000"]}')).toBe(
				'frame-ancestors http://localhost:3000',
			);
		});

		it('should serialize multiple directives and values', () => {
			expect(
				parse('{"script-src":["\'self\'","https://cdn.example.com"],"object-src":["\'none\'"]}'),
			).toBe("script-src 'self' https://cdn.example.com; object-src 'none'");
		});

		it('should convert camelCase directive names to kebab-case, as helmet.js does', () => {
			expect(parse('{"frameAncestors":["\'none\'"],"upgradeInsecureRequests":[]}')).toBe(
				"frame-ancestors 'none'; upgrade-insecure-requests",
			);
		});

		it('should accept a single value instead of an array', () => {
			expect(parse('{"frame-ancestors":"\'none\'"}')).toBe("frame-ancestors 'none'");
		});

		// A directive kept but left empty would allow nothing: `script-src` alone refuses
		// every script on the page.
		it('should drop a directive set to null, as helmet.js does', () => {
			expect(parse('{"frame-ancestors":["\'none\'"],"script-src":null}')).toBe(
				"frame-ancestors 'none'",
			);
		});

		it('should send no header when every directive is null', () => {
			expect(parse('{"script-src":null}')).toBeUndefined();
		});

		it('should reject invalid JSON', () => {
			expect(rejectionOf('{"script-src":')).toBe(
				'the value is neither valid JSON directives nor a policy string',
			);
		});
	});

	describe('policy string', () => {
		it('should pass a policy string through untouched', () => {
			expect(parse("script-src <nonce> 'strict-dynamic'; report-uri https://csp.example.com")).toBe(
				"script-src <nonce> 'strict-dynamic'; report-uri https://csp.example.com",
			);
		});

		it('should trim surrounding whitespace', () => {
			expect(parse('  script-src <nonce>  ')).toBe('script-src <nonce>');
		});

		it('should accept the nonce placeholder as a value', () => {
			expect(parse('script-src <nonce>')).toBe('script-src <nonce>');
		});

		it('should accept its own default policy', () => {
			expect(parse(DEFAULT_CONTENT_SECURITY_POLICY)).toBe(DEFAULT_CONTENT_SECURITY_POLICY);
		});
	});

	// A value helmet.js would have thrown on used to be coerced into the header, which
	// silently changed what the browser blocked.
	describe('a value the browser would read differently than it looks', () => {
		it.each([
			['a bare keyword in a directives object', '{"script-src":["self"]}'],
			['a bare keyword in a policy string', 'script-src self'],
			['a bare `none`', 'frame-ancestors none'],
			['a bare nonce', "script-src nonce-abc123 'strict-dynamic'"],
		])('should reject %s', (_name, value) => {
			expect(rejectionOf(value)).toContain('has to be quoted');
		});

		it('should reject a value that would splice in another directive', () => {
			expect(rejectionOf('{"script-src":["\'self\'; object-src \'none\'"]}')).toContain(
				'cannot contain',
			);
		});

		it('should reject a value that is not a string', () => {
			expect(rejectionOf('{"script-src":[{"self":true}]}')).toContain('not a string');
		});

		it('should reject an invalid directive name', () => {
			expect(rejectionOf('{"script src":["\'self\'"]}')).toContain('not a valid directive name');
		});

		it.each([
			['a directives object', '{"script-src":["\'self\'"],"scriptSrc":["\'none\'"]}'],
			['a policy string', "script-src 'self'; script-src 'none'"],
		])('should reject a directive set twice in %s', (_name, value) => {
			expect(rejectionOf(value)).toContain('set more than once');
		});
	});
});

describe('contentSecurityPolicyReportOnlySchema', () => {
	it('should parse a policy exactly as the enforced variable does', () => {
		expect(parseReportOnly('{"frame-ancestors":["\'none\'"]}')).toBe("frame-ancestors 'none'");
	});

	// The variable held a boolean from 1.100 until it took a policy.
	it.each(['true', 'TRUE', '1', ' true '])(
		'should read "%s" as the legacy boolean true',
		(value) => {
			expect(parseReportOnly(value)).toEqual({ legacyBoolean: true });
		},
	);

	it.each(['false', 'FALSE', '0'])('should read "%s" as the legacy boolean false', (value) => {
		expect(parseReportOnly(value)).toEqual({ legacyBoolean: false });
	});

	it('should never read a boolean as a policy', () => {
		expect(parseReportOnly('true')).not.toBe('true');
	});
});
