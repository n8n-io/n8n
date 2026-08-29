import {
	MAX_ATTACHMENT_BASE64_BYTES as API_TYPES_PER_FILE,
	MAX_ATTACHMENT_DECODED_BYTES as API_TYPES_PER_FILE_DECODED,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES as API_TYPES_TOTAL,
} from '@n8n/api-types';
import {
	MAX_ATTACHMENT_BASE64_BYTES as PARSER_PER_FILE,
	MAX_ATTACHMENT_DECODED_BYTES as PARSER_PER_FILE_DECODED,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES as PARSER_TOTAL,
} from '@n8n/instance-ai/parsers';

/**
 * The limits are declared twice on purpose: `@n8n/api-types` owns the copy the
 * request schema and the frontend read, while `@n8n/instance-ai/parsers` keeps a
 * dependency-free copy so that entry point stays consumable from lightweight test
 * environments. This is the guard that stops the two from drifting — drift would
 * mean the schema accepts a payload the validator rejects, or vice versa.
 */
describe('attachment size limits', () => {
	it('agrees on the per-file limit across packages', () => {
		expect(PARSER_PER_FILE).toBe(API_TYPES_PER_FILE);
	});

	it('agrees on the total-payload limit across packages', () => {
		expect(PARSER_TOTAL).toBe(API_TYPES_TOTAL);
	});

	it('agrees on the decoded per-file limit quoted in user-facing copy', () => {
		expect(PARSER_PER_FILE_DECODED).toBe(API_TYPES_PER_FILE_DECODED);
	});

	it('keeps the per-file limit within the total budget', () => {
		expect(API_TYPES_PER_FILE).toBeLessThanOrEqual(API_TYPES_TOTAL);
	});
});
