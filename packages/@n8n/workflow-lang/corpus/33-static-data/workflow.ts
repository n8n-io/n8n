/**
 * Workflow static data (spec 9.7): `ctx.staticData` gives the objects of
 * n8n's `$getWorkflowStaticData`. The run starts with the document of the
 * fixture and keeps its changes, because it ends with `ok`.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

function caught(f: () => unknown): string {
	try {
		f();
		return 'no error';
	} catch (error) {
		const e = error as { name: string; message: string };
		return `${e.name}: ${e.message}`;
	}
}

export default workflow({
	triggers: [webhook<{ ids: string[] }>({ path: 'dedupe' })],
	async run(ctx, trigger) {
		// A poll trigger's cursor and a Code node's dedupe list.
		const global = ctx.staticData('global');
		const seen = Array.isArray(global.seen) ? (global.seen as string[]) : [];
		const fresh = trigger.body.ids.filter((id) => !seen.includes(id));
		global.seen = [...seen, ...fresh].slice(-5);
		global.runs = (typeof global.runs === 'number' ? global.runs : 0) + 1;
		const node = ctx.staticData('node', 'Gmail Trigger');
		const before = node.lastTimeChecked;
		node.lastTimeChecked = 1700000000;
		// The same object on each call.
		const again = ctx.staticData('global') === global;
		return {
			fresh,
			before,
			again,
			badType: caught(() => ctx.staticData('other' as 'global')),
			noNode: caught(() => ctx.staticData('node')),
		};
	},
});
