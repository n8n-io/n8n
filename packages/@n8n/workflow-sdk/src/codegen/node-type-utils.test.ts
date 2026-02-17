import { describe, it, expect } from '@jest/globals';

import {
	isTriggerType,
	isStickyNote,
	isMergeType,
	generateDefaultNodeName,
} from './node-type-utils';

describe('node-type-utils', () => {
	describe('isTriggerType', () => {
		it('returns true for types containing "trigger"', () => {
			expect(isTriggerType('n8n-nodes-base.manualTrigger')).toBe(true);
			expect(isTriggerType('n8n-nodes-base.cronTrigger')).toBe(true);
		});

		it('returns true for webhook', () => {
			expect(isTriggerType('n8n-nodes-base.webhook')).toBe(true);
		});

		it('returns false for non-trigger types', () => {
			expect(isTriggerType('n8n-nodes-base.httpRequest')).toBe(false);
			expect(isTriggerType('n8n-nodes-base.set')).toBe(false);
		});

		it('is case insensitive for trigger keyword', () => {
			expect(isTriggerType('n8n-nodes-base.ManualTrigger')).toBe(true);
			expect(isTriggerType('n8n-nodes-base.TRIGGER')).toBe(true);
		});
	});

	describe('isStickyNote', () => {
		it('returns true for sticky note type', () => {
			expect(isStickyNote('n8n-nodes-base.stickyNote')).toBe(true);
		});

		it('returns false for other types', () => {
			expect(isStickyNote('n8n-nodes-base.set')).toBe(false);
			expect(isStickyNote('n8n-nodes-base.stickyNotes')).toBe(false);
		});
	});

	describe('isMergeType', () => {
		it('returns true for merge type', () => {
			expect(isMergeType('n8n-nodes-base.merge')).toBe(true);
		});

		it('returns false for other types', () => {
			expect(isMergeType('n8n-nodes-base.set')).toBe(false);
			expect(isMergeType('n8n-nodes-base.mergeNode')).toBe(false);
		});
	});

	describe('generateDefaultNodeName', () => {
		it('converts camelCase to title case with spaces', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.httpRequest')).toBe('HTTP Request');
		});

		it('handles uppercase acronyms', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.apiNode')).toBe('API Node');
		});

		it('converts common acronyms to uppercase', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.urlShortener')).toBe('URL Shortener');
			expect(generateDefaultNodeName('n8n-nodes-base.jsonParser')).toBe('JSON Parser');
			expect(generateDefaultNodeName('n8n-nodes-base.sqlQuery')).toBe('SQL Query');
		});

		it('handles AI acronym', () => {
			expect(generateDefaultNodeName('@n8n/n8n-nodes-langchain.aiAgent')).toBe('AI Agent');
		});

		it('handles AWS and GCP', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.awsLambda')).toBe('AWS Lambda');
			expect(generateDefaultNodeName('n8n-nodes-base.gcpFunction')).toBe('GCP Function');
		});

		it('handles FTP and SSH', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.ftpUpload')).toBe('FTP Upload');
			expect(generateDefaultNodeName('n8n-nodes-base.sshCommand')).toBe('SSH Command');
		});

		it('handles CSV and XML', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.csvParser')).toBe('CSV Parser');
			expect(generateDefaultNodeName('n8n-nodes-base.xmlBuilder')).toBe('XML Builder');
		});

		it('handles simple names', () => {
			expect(generateDefaultNodeName('n8n-nodes-base.set')).toBe('Set');
			expect(generateDefaultNodeName('n8n-nodes-base.if')).toBe('If');
		});

		it('takes last part after dot', () => {
			expect(generateDefaultNodeName('@n8n/n8n-nodes-langchain.tool')).toBe('Tool');
		});
	});
});
