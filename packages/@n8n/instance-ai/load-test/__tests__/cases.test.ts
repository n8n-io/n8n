import { describe, expect, it } from 'vitest';

import { BUILD_CASES, caseFor, createScriptedDecider, renderCase, selectCases } from '../cases';

describe('selectCases', () => {
	it('returns every case by default', () => {
		expect(selectCases()).toHaveLength(BUILD_CASES.length);
		expect(selectCases([])).toHaveLength(BUILD_CASES.length);
	});

	it('selects a subset in the requested order', () => {
		const selected = selectCases(['health-ping', 'hourly-ip-check']);
		expect(selected.map((c) => c.name)).toEqual(['health-ping', 'hourly-ip-check']);
	});

	it('rejects an unknown case name rather than silently narrowing traffic', () => {
		expect(() => selectCases(['hourly-ip-check', 'nope'])).toThrow(/Unknown case\(s\): nope/);
	});

	it('lists the available names in the error', () => {
		expect(() => selectCases(['nope'])).toThrow(/hourly-ip-check/);
	});
});

describe('caseFor', () => {
	it('assigns round-robin so users spread across cases', () => {
		const cases = selectCases(['hourly-ip-check', 'health-ping']);
		expect(caseFor(cases, 0).name).toBe('hourly-ip-check');
		expect(caseFor(cases, 1).name).toBe('health-ping');
		expect(caseFor(cases, 2).name).toBe('hourly-ip-check');
	});

	it('throws on an empty selection', () => {
		expect(() => caseFor([], 0)).toThrow(/No cases selected/);
	});
});

describe('renderCase', () => {
	it('substitutes the per-user workflow name into the opening', () => {
		const rendered = renderCase(caseFor(BUILD_CASES, 0), 4);
		expect(rendered.workflowName).toBe('Load Hourly IP Check 4');
		expect(rendered.opening).toContain('Load Hourly IP Check 4');
		expect(rendered.opening).not.toContain('{name}');
	});

	it('substitutes the index everywhere, including webhook paths', () => {
		const webhookCase = BUILD_CASES.find((c) => c.name === 'webhook-sample-api');
		expect(webhookCase).toBeDefined();
		const rendered = renderCase(webhookCase!, 7);
		// Distinct webhook paths matter: two users on /load-sample would conflict.
		expect(rendered.opening).toContain('/load-sample-7');
		expect(rendered.opening).not.toContain('{n}');
	});

	it('leaves no placeholders in any rendered prompt of any case', () => {
		for (const buildCase of BUILD_CASES) {
			const rendered = renderCase(buildCase, 3);
			for (const text of [rendered.opening, ...rendered.followUps]) {
				expect(text).not.toContain('{n}');
				expect(text).not.toContain('{name}');
			}
		}
	});

	it('gives the read-only control case no workflow name', () => {
		const readOnly = BUILD_CASES.find((c) => c.name === 'read-only');
		expect(readOnly).toBeDefined();
		const rendered = renderCase(readOnly!, 1);
		expect(rendered.builds).toBe(false);
		expect(rendered.workflowName).toBeUndefined();
	});

	it('yields a unique workflow name per user for every building case', () => {
		const names = new Set<string>();
		for (const buildCase of BUILD_CASES.filter((c) => c.builds)) {
			for (let index = 0; index < 50; index++) {
				names.add(renderCase(buildCase, index).workflowName ?? '');
			}
		}
		expect(names.size).toBe(BUILD_CASES.filter((c) => c.builds).length * 50);
	});
});

describe('createScriptedDecider', () => {
	it('stops after maxTurns, counting the opening message as turn 1', async () => {
		const decider = createScriptedDecider(['a', 'b', 'c'], 3);
		expect(await decider()).toEqual({ kind: 'followUp', message: 'a' });
		expect(await decider()).toEqual({ kind: 'followUp', message: 'b' });
		// Turns sent is now 3 (opening + a + b) — done.
		expect(await decider()).toEqual({ kind: 'done' });
	});

	it('sends nothing when maxTurns is 1', async () => {
		const decider = createScriptedDecider(['a'], 1);
		expect(await decider()).toEqual({ kind: 'done' });
	});

	it('stops when follow-ups run out before maxTurns', async () => {
		const decider = createScriptedDecider(['only'], 10);
		expect(await decider()).toEqual({ kind: 'followUp', message: 'only' });
		expect(await decider()).toEqual({ kind: 'done' });
	});

	it('keeps returning done once finished', async () => {
		const decider = createScriptedDecider([], 5);
		expect(await decider()).toEqual({ kind: 'done' });
		expect(await decider()).toEqual({ kind: 'done' });
	});

	it('never exceeds maxTurns total LLM turns — the cost ceiling', async () => {
		const maxTurns = 4;
		const decider = createScriptedDecider(['a', 'b', 'c', 'd', 'e', 'f'], maxTurns);
		let sent = 1; // the opening
		while ((await decider()).kind === 'followUp') sent++;
		expect(sent).toBe(maxTurns);
	});
});
