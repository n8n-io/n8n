import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkTicket, isAreaRestricted, isTicketApproved } from '../src/check.js';
import { writeEvidenceReport } from '../src/evidence.js';
import type { Policy, Ticket } from '../src/types.js';

const basePolicy: Policy = {
	allowed_change: {
		requires_approval: true,
		maximum_scope: 1000,
	},
	restricted_areas: [
		'packages/core',
		'credentials',
		'HTTP Request',
		'Code',
		'Webhook',
		'Form Trigger',
		'Schedule',
	],
	bug_fix_requirements: [
		'linked_or_approved_issue',
		'regression_test',
		'valid_behavior_test',
		'manual_test_instructions',
	],
};

const approvedTicket: Ticket = {
	id: 'N8N-DEMO-17',
	simulation: true,
	status: 'approved',
	type: 'bug',
	area: 'packages/nodes-base/nodes/DateTime',
	allowed_read_paths: [
		'CONTRIBUTING.md',
		'contrib-runway/policies/n8n.yaml',
		'packages/nodes-base/nodes/DateTime/**',
	],
	allowed_write_paths: [
		'packages/nodes-base/nodes/DateTime/**',
		'contrib-runway/evidence/N8N-DEMO-17.md',
	],
	problem: 'Invalid timezone input produces a confusing error.',
	desired_outcome: 'Show an actionable n8n error.',
	acceptance_criteria: [
		'Valid behavior remains unchanged',
		'Invalid timezone produces a helpful error',
	],
};

const restrictedTicket: Ticket = {
	...approvedTicket,
	id: 'N8N-DEMO-18',
	area: 'packages/core/src/execution-engine',
};

const unapprovedTicket: Ticket = {
	...approvedTicket,
	id: 'N8N-DEMO-19',
	status: 'pending',
};

describe('checkTicket', () => {
	it('returns READY for an approved ticket in an allowed area', () => {
		const result = checkTicket(approvedTicket, basePolicy);

		expect(result.status).toBe('READY');
		expect(result.approved).toBe(true);
		expect(result.areaRestricted).toBe(false);
		expect(result.requiredTests).toEqual(basePolicy.bug_fix_requirements);
		expect(result.allowedReadPaths).toContain('packages/nodes-base/nodes/DateTime/**');
		expect(result.allowedWritePaths).toContain('contrib-runway/evidence/N8N-DEMO-17.md');
		expect(result.blockReasons).toEqual([]);
	});

	it('returns BLOCKED for a ticket in a restricted area', () => {
		const result = checkTicket(restrictedTicket, basePolicy);

		expect(result.status).toBe('BLOCKED');
		expect(result.approved).toBe(true);
		expect(result.areaRestricted).toBe(true);
		expect(result.requiredTests).toEqual(basePolicy.bug_fix_requirements);
		expect(result.allowedReadPaths).toEqual([]);
		expect(result.allowedWritePaths).toEqual([]);
		expect(result.blockReasons).toContain(
			'Area "packages/core/src/execution-engine" is restricted by policy.',
		);
	});

	it('returns BLOCKED when approval is required but missing', () => {
		const result = checkTicket(unapprovedTicket, basePolicy);

		expect(result.status).toBe('BLOCKED');
		expect(result.approved).toBe(false);
		expect(result.allowedReadPaths).toEqual([]);
		expect(result.allowedWritePaths).toEqual([]);
		expect(result.blockReasons).toContain('Ticket is not approved.');
	});
});

describe('policy helpers', () => {
	it('detects approved tickets', () => {
		expect(isTicketApproved(approvedTicket, basePolicy)).toBe(true);
		expect(isTicketApproved(unapprovedTicket, basePolicy)).toBe(false);
	});

	it('detects restricted path areas', () => {
		expect(isAreaRestricted('packages/core/src/foo', basePolicy.restricted_areas)).toBe(true);
		expect(isAreaRestricted('packages/nodes-base/nodes/DateTime', basePolicy.restricted_areas)).toBe(
			false,
		);
	});
});

describe('writeEvidenceReport', () => {
	it('writes a markdown evidence file for the check result', () => {
		const dir = mkdtempSync(join(tmpdir(), 'contrib-runway-evidence-'));
		try {
			const result = checkTicket(approvedTicket, basePolicy);
			const path = writeEvidenceReport(result, dir);
			const contents = readFileSync(path, 'utf8');

			expect(path).toBe(join(dir, 'N8N-DEMO-17.md'));
			expect(contents).toContain('# Evidence: N8N-DEMO-17');
			expect(contents).toContain('**Result:** READY');
			expect(contents).toContain('packages/nodes-base/nodes/DateTime/**');
			expect(contents).toContain('## Approved boundaries');
			expect(contents).toContain('### Read');
			expect(contents).toContain('### Write');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
