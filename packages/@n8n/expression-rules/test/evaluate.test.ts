import { evaluateRules, buildClaimsContext } from '@/index';
import type { ClaimRule } from '@/index';

const claims = {
	sub: 'alice',
	groups: ['admin', 'wf'],
	scope: 'wf-execute wf-read',
	status: 'active',
};

const ctx = buildClaimsContext(claims);

describe('evaluateRules (deny-wins claim ACL)', () => {
	it('allows when an allow rule matches and no deny matches', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ $claims.groups.includes("admin") }}' },
		];
		const result = evaluateRules(rules, ctx);
		expect(result.allowed).toBe(true);
		expect(result.matchedAllow).toEqual(rules[0]);
	});

	it('denies by default when no allow rule matches', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ $claims.groups.includes("superadmin") }}' },
		];
		expect(evaluateRules(rules, ctx).allowed).toBe(false);
	});

	it('denies by default when the rule list is empty', () => {
		expect(evaluateRules([], ctx).allowed).toBe(false);
	});

	it('lets a matching deny rule override a matching allow rule (deny-wins)', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ $claims.groups.includes("admin") }}' },
			{ effect: 'deny', expression: '{{ $claims.status === "suspended" }}' },
			{ effect: 'deny', expression: '{{ $claims.groups.includes("admin") }}' },
		];
		const result = evaluateRules(rules, ctx);
		expect(result.allowed).toBe(false);
		expect(result.matchedDeny?.expression).toBe('{{ $claims.groups.includes("admin") }}');
	});

	it('accepts the n8n "=" expression prefix', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '={{ $claims.groups.includes("admin") }}' },
		];
		expect(evaluateRules(rules, ctx).allowed).toBe(true);
	});

	it('matches on a scope substring check', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ $claims.scope.includes("wf-execute") }}' },
		];
		expect(evaluateRules(rules, ctx).allowed).toBe(true);
	});

	it('treats an expression accessing a non-existent path as non-matching', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ $claims.nope.deep.path === "x" }}' },
		];
		expect(evaluateRules(rules, ctx).allowed).toBe(false);
	});

	it('treats an empty or missing expression as non-matching (no crash)', () => {
		const rules = [
			{ effect: 'allow', expression: '' },
			{ effect: 'allow', expression: undefined as unknown as string },
		] as ClaimRule[];
		expect(evaluateRules(rules, ctx).allowed).toBe(false);
	});

	it('treats a throwing expression as non-matching (does not grant access)', () => {
		const rules: ClaimRule[] = [
			{ effect: 'allow', expression: '{{ (() => { throw new Error("boom") })() }}' },
		];
		expect(evaluateRules(rules, ctx).allowed).toBe(false);
	});
});
