import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { sanitizeInboundBaggage } from '../inbound-baggage';

describe('sanitizeInboundBaggage', () => {
	const logger = mock<Logger>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([undefined, '', 42, ['tenant=acme', 1]])('returns undefined for %p', (header) => {
		expect(sanitizeInboundBaggage(header, logger)).toBeUndefined();
	});

	it('keeps caller entries', () => {
		expect(sanitizeInboundBaggage('tenant=acme,region=eu', logger)).toBe('tenant=acme,region=eu');
		expect(logger.debug).not.toHaveBeenCalled();
	});

	it('keeps entry metadata', () => {
		expect(sanitizeInboundBaggage('tenant=acme;ttl=60', logger)).toBe('tenant=acme;ttl=60');
	});

	it('keeps percent-encoded values encoded', () => {
		expect(sanitizeInboundBaggage('team=a%20b%2Cc', logger)).toBe('team=a%20b%2Cc');
	});

	it('keeps characters that W3C allows unencoded as they are', () => {
		const header = 'callback=https://a.example/b?c=d&e=f+g,user=me@example.com';

		expect(sanitizeInboundBaggage(header, logger)).toBe(header);
	});

	it('keeps duplicate keys without logging', () => {
		expect(sanitizeInboundBaggage('a=1,a=2', logger)).toBe('a=1,a=2');
		expect(logger.debug).not.toHaveBeenCalled();
	});

	it('keeps an entry with an empty value', () => {
		expect(sanitizeInboundBaggage('empty-value=', logger)).toBe('empty-value=');
	});

	it('trims whitespace around entries', () => {
		expect(sanitizeInboundBaggage(' tenant = acme , region=eu ', logger)).toBe(
			'tenant = acme,region=eu',
		);
	});

	it('joins repeated headers', () => {
		expect(sanitizeInboundBaggage(['tenant=acme', 'region=eu'], logger)).toBe(
			'tenant=acme,region=eu',
		);
	});

	it('drops entries with the n8n. prefix in any case', () => {
		const header = 'tenant=acme,n8n.execution.id=forged,N8N.Project.Name=forged';

		expect(sanitizeInboundBaggage(header, logger)).toBe('tenant=acme');
		expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
			kept: 1,
			reservedPrefix: 2,
			invalid: 0,
			overLimit: 0,
		});
	});

	it('keeps keys that only contain n8n', () => {
		expect(sanitizeInboundBaggage('n8n=1,x.n8n.y=2', logger)).toBe('n8n=1,x.n8n.y=2');
	});

	it('returns undefined when only n8n. entries are sent', () => {
		expect(sanitizeInboundBaggage('n8n.workflow.id=forged', logger)).toBeUndefined();
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});

	it('skips empty list members without logging', () => {
		expect(sanitizeInboundBaggage(',,tenant=acme,', logger)).toBe('tenant=acme');
		expect(logger.debug).not.toHaveBeenCalled();
	});

	it('drops malformed entries', () => {
		const header = 'tenant=acme,novalue,=empty-key,bad key=1,quote="x",prop=1;badÿ';

		expect(sanitizeInboundBaggage(header, logger)).toBe('tenant=acme');
		expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
			kept: 1,
			reservedPrefix: 0,
			invalid: 5,
			overLimit: 0,
		});
	});

	it('keeps at most 180 entries', () => {
		const header = Array.from({ length: 181 }, (_, i) => `k${i}=v`).join(',');

		const sanitized = sanitizeInboundBaggage(header, logger);

		expect(sanitized?.split(',')).toHaveLength(180);
		expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
			kept: 180,
			reservedPrefix: 0,
			invalid: 0,
			overLimit: 1,
		});
	});

	it('drops an entry over 4096 bytes', () => {
		const header = `big=${'v'.repeat(4096)},tenant=acme`;

		expect(sanitizeInboundBaggage(header, logger)).toBe('tenant=acme');
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});

	it('stops at 8192 bytes in total', () => {
		const entry = (key: string) => `${key}=${'v'.repeat(3000)}`;
		const header = [entry('a'), entry('b'), entry('c')].join(',');

		expect(sanitizeInboundBaggage(header, logger)).toBe([entry('a'), entry('b')].join(','));
		expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
			kept: 2,
			reservedPrefix: 0,
			invalid: 0,
			overLimit: 1,
		});
	});
});
