import { describe, expect, it } from 'vitest';

import {
	BUILD_CASES,
	caseFor,
	createScriptedDecider,
	maxDeliverableTurns,
	renderCase,
	selectCases,
} from '../cases';

const BASE = 'http://localhost:5678';

describe('selectCases', () => {
	it('returns every case by default', () => {
		expect(selectCases()).toHaveLength(BUILD_CASES.length);
		expect(selectCases([])).toHaveLength(BUILD_CASES.length);
	});

	it('selects a subset in the requested order', () => {
		const selected = selectCases(['health-ping', 'hourly-health-check']);
		expect(selected.map((c) => c.name)).toEqual(['health-ping', 'hourly-health-check']);
	});

	it('rejects an unknown case name rather than silently narrowing traffic', () => {
		expect(() => selectCases(['hourly-health-check', 'nope'])).toThrow(/Unknown case\(s\): nope/);
	});

	it('lists the available names in the error', () => {
		expect(() => selectCases(['nope'])).toThrow(/hourly-health-check/);
	});
});

describe('caseFor', () => {
	it('assigns round-robin so users spread across cases', () => {
		const cases = selectCases(['hourly-health-check', 'health-ping']);
		expect(caseFor(cases, 0).name).toBe('hourly-health-check');
		expect(caseFor(cases, 1).name).toBe('health-ping');
		expect(caseFor(cases, 2).name).toBe('hourly-health-check');
	});

	it('throws on an empty selection', () => {
		expect(() => caseFor([], 0)).toThrow(/No cases selected/);
	});
});

describe('renderCase', () => {
	it('substitutes the per-user workflow name into the opening', () => {
		const rendered = renderCase(caseFor(BUILD_CASES, 0), 4, BASE);
		expect(rendered.workflowName).toBe('Load Health Check 4');
		expect(rendered.opening).toContain('Load Health Check 4');
		expect(rendered.opening).not.toContain('{name}');
	});

	it('substitutes the index everywhere, including webhook paths', () => {
		const webhookCase = BUILD_CASES.find((c) => c.name === 'webhook-sample-api');
		expect(webhookCase).toBeDefined();
		const rendered = renderCase(webhookCase!, 7, BASE);
		// Distinct webhook paths matter: two users on /load-sample would conflict.
		expect(rendered.opening).toContain('/load-sample-7');
		expect(rendered.opening).not.toContain('{n}');
	});

	it('leaves no placeholders in any rendered prompt of any case', () => {
		for (const buildCase of BUILD_CASES) {
			const rendered = renderCase(buildCase, 3, BASE);
			for (const text of [rendered.opening, ...rendered.followUps]) {
				expect(text).not.toContain('{n}');
				expect(text).not.toContain('{name}');
				expect(text).not.toContain('{baseUrl}');
			}
		}
	});

	it('points the HTTP case at the target instance, not a third party', () => {
		// A flaky public endpoint (httpbin.org 503s) makes the agent retry and
		// remediate, injecting variance into the memory numbers.
		const httpCase = BUILD_CASES.find((c) => c.name === 'hourly-health-check');
		const rendered = renderCase(httpCase!, 0, BASE);
		expect(rendered.opening).toContain('http://localhost:5678/healthz');
		expect(rendered.opening).not.toContain('httpbin');
	});

	it('does not double the slash when baseUrl has a trailing one', () => {
		const httpCase = BUILD_CASES.find((c) => c.name === 'hourly-health-check');
		const rendered = renderCase(httpCase!, 0, 'https://n8n.example.com/');
		expect(rendered.opening).toContain('https://n8n.example.com/healthz');
		expect(rendered.opening).not.toContain('.com//healthz');
	});

	it('no case references an external host', () => {
		for (const buildCase of BUILD_CASES) {
			const rendered = renderCase(buildCase, 0, BASE);
			for (const text of [rendered.opening, ...rendered.followUps]) {
				expect(text).not.toMatch(/httpbin|example\.org|jsonplaceholder/i);
			}
		}
	});

	it('gives the read-only control case no workflow name', () => {
		const readOnly = BUILD_CASES.find((c) => c.name === 'read-only');
		expect(readOnly).toBeDefined();
		const rendered = renderCase(readOnly!, 1, BASE);
		expect(rendered.builds).toBe(false);
		expect(rendered.workflowName).toBeUndefined();
	});

	it('yields a unique workflow name per user for every building case', () => {
		const names = new Set<string>();
		for (const buildCase of BUILD_CASES.filter((c) => c.builds)) {
			for (let index = 0; index < 50; index++) {
				names.add(renderCase(buildCase, index, BASE).workflowName ?? '');
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

describe('maxDeliverableTurns', () => {
	it('is opening + the shortest follow-up list across selected cases', () => {
		// Every shipped case has 3 follow-ups, so 4 turns is the current ceiling.
		expect(maxDeliverableTurns(BUILD_CASES)).toBe(4);
		expect(maxDeliverableTurns(selectCases(['health-ping']))).toBe(4);
	});

	it('is bounded by the shortest case, not the longest', () => {
		const short = { ...BUILD_CASES[0], followUps: ['only one'] };
		expect(maxDeliverableTurns([BUILD_CASES[0], short])).toBe(2);
	});

	it('handles an empty selection', () => {
		expect(maxDeliverableTurns([])).toBe(0);
	});

	it('matches what the decider will actually send', async () => {
		// Guards the warning against drifting from the decider's real behaviour:
		// asking for 99 turns must yield exactly maxDeliverableTurns.
		for (const buildCase of BUILD_CASES) {
			const decider = createScriptedDecider(buildCase.followUps, 99);
			let sent = 1; // the opening
			while ((await decider()).kind === 'followUp') sent++;
			expect(sent).toBe(maxDeliverableTurns([buildCase]));
		}
	});
});
