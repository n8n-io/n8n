/**
 * The identity of the Node.js that a compiled workflow copies (`node-identity.ts`). No test
 * names a version of the Node.js that runs it.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { convertWorkflow } from '../index.ts';
import {
	identityKey,
	localeIdentity,
	localTimeIsUtc,
	processIdentity,
	setRunnerZone,
	RUNTIME_DATA,
	runtimeDataMismatch,
	setTargetNode,
	targetIsProcess,
	targetNode,
} from '../node-identity.ts';

const WORKFLOW = {
	name: 'W',
	nodes: [
		{
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
};

describe('the Node.js identity', () => {
	afterEach(() => setTargetNode(undefined));

	it('is the versions of this process, and the target by default', () => {
		const own = processIdentity();
		expect(own).toEqual({
			icu: process.versions.icu,
			cldr: process.versions.cldr,
			tz: process.versions.tz,
			unicode: process.versions.unicode,
			v8: process.versions.v8,
			ada: process.versions.ada,
		});
		expect(targetNode()).toMatchObject(own);
		expect(targetIsProcess()).toBe(true);
	});

	it('has the time zone of the process and of the task runner, and both are in the key', () => {
		const before = process.env.TZ;
		try {
			process.env.TZ = 'UTC';
			setRunnerZone(undefined);
			expect(targetNode().zone).toBe('UTC');
			expect(localTimeIsUtc('process')).toBe(true);
			// n8n gives the runner no TZ: with a TZ in this process the zone of the runner is not known.
			expect(targetNode().runnerZone).toBe('?');
			expect(localTimeIsUtc('runner')).toBe(false);
			const unknown = identityKey();
			setRunnerZone('UTC');
			expect(localTimeIsUtc('runner')).toBe(true);
			expect(identityKey()).not.toBe(unknown);
			setRunnerZone('Europe/Berlin');
			expect(localTimeIsUtc('runner')).toBe(false);
			process.env.TZ = 'Europe/Berlin';
			expect(targetNode().zone).toBe('Europe/Berlin');
			expect(localTimeIsUtc('process')).toBe(false);
			setTargetNode(processIdentity());
			expect(localTimeIsUtc('process')).toBe(false);
			expect(localTimeIsUtc('runner')).toBe(false);
			setTargetNode({ ...processIdentity(), zone: 'Etc/UTC', runnerZone: 'UTC' });
			expect(localTimeIsUtc('process')).toBe(true);
			expect(localTimeIsUtc('runner')).toBe(true);
		} finally {
			if (before === undefined) delete process.env.TZ;
			else process.env.TZ = before;
			setRunnerZone(undefined);
		}
	});

	it.each(['icu', 'cldr', 'tz', 'unicode', 'v8', 'ada'] as const)(
		'has another key and is not this process when %s is another one',
		(field) => {
			const key = identityKey();
			setTargetNode({ ...processIdentity(), [field]: 'another' });
			expect(identityKey()).not.toBe(key);
			expect(targetIsProcess()).toBe(false);
		},
	);

	it('has the locale data and V8 in the locale identity, and not the time zone rules', () => {
		const own = processIdentity();
		const base = localeIdentity(own);
		expect(localeIdentity({ ...own, tz: 'another' })).toBe(base);
		expect(localeIdentity({ ...own, ada: 'another' })).toBe(base);
		for (const field of ['icu', 'cldr', 'v8'] as const) {
			expect(localeIdentity({ ...own, [field]: 'another' })).not.toBe(base);
		}
	});

	it('compiles no workflow for a Node.js with other Unicode or CLDR tables than the runtime', () => {
		const fitting = { ...processIdentity(), ...RUNTIME_DATA };
		expect(runtimeDataMismatch(fitting)).toBeNull();
		setTargetNode(fitting);
		expect(convertWorkflow(WORKFLOW).diagnostics.map((d) => d.code)).not.toContain('node-data');
		for (const change of [{ unicode: '1.0' }, { cldr: '1.0' }]) {
			setTargetNode({ ...fitting, ...change });
			const result = convertWorkflow(WORKFLOW);
			expect(result.ok).toBe(false);
			expect(result.diagnostics.map((d) => d.code)).toEqual(['node-data']);
		}
	});
});
