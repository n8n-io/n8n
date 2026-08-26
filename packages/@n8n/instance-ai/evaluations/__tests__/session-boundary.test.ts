import { transcriptPrefixFromSeed } from '../harness/conversation-seed';
import { EvalTestCaseSchema } from '../harness/schema';
import { transcriptAsText } from '../utils/conversation-text';

/** Seed messages in the envelope shape the restore path produces. */
const msg = (role: 'user' | 'assistant', text: string) => ({
	role,
	type: 'message',
	content: [{ type: 'text', text }],
});

const baseCase = {
	conversation: [{ role: 'user' as const, text: 'now add the write step' }],
	complexity: 'simple' as const,
	tags: ['memory'],
	memoryExpectations: ['the agreed cutover is still available to the agent'],
};

describe('seed.sessionBoundary', () => {
	it('is accepted on an inline seed', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: {
				mode: 'inline',
				messages: [{ role: 'user', text: 'cutover is 2026-03-01' }],
				sessionBoundary: true,
			},
		});
		expect(parsed.success).toBe(true);
	});

	it('defaults to absent, so existing cases keep one-thread seeding', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: { mode: 'inline', messages: [{ role: 'user', text: 'cutover is 2026-03-01' }] },
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			const seed = parsed.data.seed;
			expect(seed?.mode).toBe('inline');
			if (seed?.mode === 'inline') expect(seed.sessionBoundary).toBeUndefined();
		}
	});

	it('is refused on a replay seed, where it has no meaning', () => {
		// `replay` reconstructs one real thread; a boundary inside it is incoherent, and
		// the strict arm must reject it loudly rather than silently dropping the flag.
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: { mode: 'replay', threadId: 'abc123', sessionBoundary: true },
		});
		expect(parsed.success).toBe(false);
	});
});

describe('prior-session labelling', () => {
	const messages = [msg('user', 'cutover is 2026-03-01'), msg('assistant', 'noted')];

	it('marks seeded turns as a prior session when asked', () => {
		const turns = transcriptPrefixFromSeed(messages, { priorSession: true });
		expect(turns.length).toBeGreaterThan(0);
		expect(turns.every((t) => t.seeded)).toBe(true);
		expect(turns.every((t) => t.priorSession)).toBe(true);
	});

	it('leaves same-thread seeding unmarked', () => {
		const turns = transcriptPrefixFromSeed(messages);
		expect(turns.every((t) => t.seeded)).toBe(true);
		expect(turns.some((t) => t.priorSession)).toBe(false);
	});

	it('tells the judge a prior-session turn is not visible to the agent', () => {
		// Without this the judge reads a boundary case as one continuous conversation
		// and penalises the agent for not remembering something it never received.
		const text = transcriptAsText([
			...transcriptPrefixFromSeed(messages, { priorSession: true }),
			{ userMessage: 'now add the write step', steps: [] },
		]);
		expect(text).toContain('PREVIOUS SESSION');
		expect(text).toContain('does NOT have this in the graded session');
		// Exactly the seeded turns carry the label; the live turn must not. Asserted by
		// counting headers rather than guessing an index — a seed's user+assistant pair
		// collapses into one turn, so the live turn's number depends on the fixture.
		const headers = text.split('\n').filter((l) => l.startsWith('### Turn'));
		expect(headers).toHaveLength(2);
		expect(headers.filter((h) => h.includes('PREVIOUS SESSION'))).toHaveLength(1);
		expect(headers[headers.length - 1]).not.toContain('PREVIOUS SESSION');
	});

	it('adds no label at all without a boundary', () => {
		const text = transcriptAsText([
			...transcriptPrefixFromSeed(messages),
			{ userMessage: 'now add the write step', steps: [] },
		]);
		expect(text).not.toContain('PREVIOUS SESSION');
	});
});

describe('seeded agents across a boundary', () => {
	// Agents are instance-scoped, so crossing is the documented intent and must stay
	// authorable. What does NOT cross is the thread→agent binding: the history is
	// restored into the seed thread, so the live turn continues no agent. The harness
	// warns and declines to promote a "last targeted" agent it has no basis to pick.
	it('accepts a boundary case that also seeds agents', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: {
				mode: 'inline',
				sessionBoundary: true,
				messages: [{ role: 'user', text: 'use the triage agent for this' }],
				agents: [
					{
						id: 'seedagent-triage-01',
						config: { name: 'Triage', model: '', instructions: 'Triage incoming issues.' },
					},
				],
			},
		});
		expect(parsed.success).toBe(true);
	});
});

describe('seed.priorRuns', () => {
	const seededWorkflow = {
		id: 'wfnightlysync01',
		name: 'Nightly Sync',
		nodes: [],
		connections: {},
	};

	it('accepts a prior run naming a seeded workflow', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: {
				mode: 'inline',
				messages: [{ role: 'user', text: 'set up the nightly sync' }],
				workflows: [seededWorkflow],
				priorRuns: [{ workflow: 'Nightly Sync', hints: 'the HTTP call returns 500' }],
			},
		});
		expect(parsed.success).toBe(true);
	});

	it('refuses a prior run naming a workflow the seed does not declare', () => {
		// Caught at authoring time on purpose: mid-build this reads like an infrastructure
		// fault rather than a typo in the case.
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: {
				mode: 'inline',
				messages: [{ role: 'user', text: 'set up the nightly sync' }],
				workflows: [seededWorkflow],
				priorRuns: [{ workflow: 'Nightly Snyc' }],
			},
		});
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(JSON.stringify(parsed.error.issues)).toContain('does not declare');
		}
	});

	it('refuses a prior run when the seed declares no workflows at all', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: {
				mode: 'inline',
				messages: [{ role: 'user', text: 'hello' }],
				priorRuns: [{ workflow: 'Nightly Sync' }],
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('is absent by default, so existing cases run nothing beforehand', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: { mode: 'inline', messages: [{ role: 'user', text: 'hello' }] },
		});
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.data.seed?.mode === 'inline') {
			expect(parsed.data.seed.priorRuns).toBeUndefined();
		}
	});

	it('is refused on a replay seed, which seeds no workflows to run', () => {
		const parsed = EvalTestCaseSchema.safeParse({
			...baseCase,
			seed: { mode: 'replay', threadId: 'abc123', priorRuns: [{ workflow: 'Nightly Sync' }] },
		});
		expect(parsed.success).toBe(false);
	});
});
