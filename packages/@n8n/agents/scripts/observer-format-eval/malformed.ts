// Runs hand-written malformed outputs through runObservationLogObserver: wrong structures must be rejected.
import { InMemoryMemory } from '../../src/runtime/memory/memory-store';
import { runObservationLogObserver } from '../../src/runtime/memory/observation-log-observer';
const cases: Array<[string, string]> = [
	['empty output', ''],
	['prose only', 'Here is what I noticed: the user wants a CRM sync.'],
	['preamble before bullets', 'Observations:\n* CRITICAL (10:00) Keep this.'],
	['code fence around bullets', '```\n* CRITICAL (10:00) Keep this.\n```'],
	['NO_OBSERVATIONS mixed with bullets', 'NO_OBSERVATIONS\n* CRITICAL (10:00) Keep this.'],
	['unindented stray text after entry', '* CRITICAL (10:00) Keep this.\nUnformatted detail.'],
	['indented text before any entry', '  Detail first.\n* CRITICAL (10:00) Keep this.'],
	['child marker before any parent', '  * INFO (10:00) Orphan child.'],
	['marker with empty text', '* INFO    '],
	['unknown marker, unindented', '* COMPLETED (10:00) Done.'],
	[
		'indented unknown marker after entry',
		'* CRITICAL (10:00) Keep this.\n  * COMPLETED (10:01) Done.',
	],
	['indented code fence after entry', '* CRITICAL (10:00) Keep this.\n  ```\n  code\n  ```'],
	['indented NO_OBSERVATIONS after entry', '* CRITICAL (10:00) Keep this.\n  NO_OBSERVATIONS'],
	[
		'indented detail list after entry (target)',
		'* CRITICAL (10:00) Rules:\n  * Count paid.\n    1. Skip void.',
	],
];
async function main() {
	for (const [name, text] of cases) {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 't', resourceId: 'u' });
		await store.saveMessages({
			threadId: 't',
			resourceId: 'u',
			messages: [
				{ id: 'm1', createdAt: new Date(), role: 'user', content: [{ type: 'text', text: 'x' }] },
			],
		});
		const r = await runObservationLogObserver({
			memory: store,
			observationScopeId: 't',
			observationLogTailLimit: 20,
			tokenCounter: () => 1,
			observe: async () => text,
		});
		const stored = (await store.getActiveObservationLog({ observationScopeId: 't' })).map(
			(e) => e.text,
		);
		const ok = r.status === 'ran' && r.cursorAdvanced;
		console.log(
			`${ok ? 'ACCEPT' : 'reject'} | ${name}${ok ? ` -> ${JSON.stringify(stored)}` : ''}`,
		);
	}
}
void main();
