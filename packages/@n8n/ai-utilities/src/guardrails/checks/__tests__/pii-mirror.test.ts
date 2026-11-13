import { TOOL_GUARDRAIL_PII_ENTITIES } from '@n8n/api-types';

import { PIIEntity } from '../pii';

/**
 * The agent config schema mirrors this enum in `@n8n/api-types` because
 * api-types cannot depend on ai-utilities (circular). If the two drift, the
 * schema accepts an entity the PII check silently skips. This test fails on
 * any addition, removal, or rename in either list.
 */
describe('PII entity mirror', () => {
	it('matches the api-types schema list exactly', () => {
		expect([...TOOL_GUARDRAIL_PII_ENTITIES].sort()).toEqual(Object.values(PIIEntity).sort());
	});
});
