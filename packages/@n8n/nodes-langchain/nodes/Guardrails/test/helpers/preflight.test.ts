import { describe, it, expect } from '@jest/globals';

import { applyPreflightModifications } from '../../helpers/preflight';
import type { GuardrailResult } from '../../actions/types';

describe('preflight helper', () => {
	describe('applyPreflightModifications', () => {
		it('should return original data when no preflight results', () => {
			const data = 'This is some test data';
			const preflightResults: GuardrailResult[] = [];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe(data);
		});

		it('should return original data when preflight results have no maskEntities', () => {
			const data = 'This is some test data';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'test-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.5,
					executionFailed: false,
					info: { someOtherInfo: 'value' },
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe(data);
		});

		it('should mask PII entities in text', () => {
			const data = 'My email is john.doe@example.com and my phone is 555-123-4567';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['john.doe@example.com'],
							phone: ['555-123-4567'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('My email is <email> and my phone is <phone>');
		});

		it('should handle multiple preflight results with different maskEntities', () => {
			const data = 'Contact john.doe@example.com at 555-123-4567 or visit https://example.com';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['john.doe@example.com'],
							phone: ['555-123-4567'],
						},
					},
				},
				{
					guardrailName: 'url-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.6,
					executionFailed: false,
					info: {
						maskEntities: {
							url: ['https://example.com'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('Contact <email> at <phone> or visit <url>');
		});

		it('should handle overlapping PII entities correctly by processing longer matches first', () => {
			const data = 'My email is john.doe@example.com and my name is john';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['john.doe@example.com'],
							name: ['john'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('My email is <email> and my name is <name>');
		});

		it('should handle empty maskEntities arrays', () => {
			const data = 'This is some test data';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: [],
							phone: [],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe(data);
		});

		it('should handle non-string input gracefully', () => {
			const data = null as any;
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['test@example.com'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe(data);
		});

		it('should handle special regex characters in PII entities safely', () => {
			const data = 'Special chars: [test] (value) {data} ^start $end';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							special: ['[test]', '(value)', '{data}', '^start', '$end'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('Special chars: <special> <special> <special> <special> <special>');
		});

		it('should handle duplicate PII entities in the same category', () => {
			const data = 'Emails: john@example.com and jane@example.com';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['john@example.com', 'jane@example.com'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('Emails: <email> and <email>');
		});

		it('should handle case-sensitive PII matching', () => {
			const data = 'Email: John@Example.com and john@example.com';
			const preflightResults: GuardrailResult[] = [
				{
					guardrailName: 'pii-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.8,
					executionFailed: false,
					info: {
						maskEntities: {
							email: ['john@example.com'],
						},
					},
				},
			];

			const result = applyPreflightModifications(data, preflightResults);

			expect(result).toBe('Email: John@Example.com and <email>');
		});
	});
});
