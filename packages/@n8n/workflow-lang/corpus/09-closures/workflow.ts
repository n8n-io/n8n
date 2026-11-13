/** Closures: mutated captures, per-iteration bindings, factories and hoisted functions. */
import { webhook, workflow } from '@n8n/workflow-lang';

const PREFIX = 'id-';

function makeCounter(start: number) {
	let count = start;
	return {
		inc: () => ++count,
		add: (n: number) => {
			count += n;
			return count;
		},
		get: () => count,
	};
}

export default workflow({
	triggers: [webhook<{ values: number[] }>({ path: 'closures' })],
	async run(ctx, trigger) {
		const counter = makeCounter(10);
		counter.inc();
		counter.add(5);
		const fns: Array<() => number> = [];
		for (let i = 0; i < 3; i++) fns.push(() => i * 10);
		const snapshots = fns.map((f) => f());
		let total = 0;
		const accumulate = (v: number) => {
			total += v;
		};
		for (const v of trigger.body.values) accumulate(v);
		const tagged = trigger.body.values.map((v) => label(v));
		function label(v: number): string {
			return isEven(v) ? `${PREFIX}${v}:even` : `${PREFIX}${v}:odd`;
		}
		function isEven(n: number): boolean {
			return n === 0 ? true : isOdd(n - 1);
		}
		function isOdd(n: number): boolean {
			return n === 0 ? false : isEven(n - 1);
		}
		let status = 'pending';
		const setStatus = async (s: string) => {
			await ctx.http({
				name: 'Report',
				method: 'POST',
				url: 'https://status.example.com',
				body: { s, total },
			});
			status = s;
		};
		await setStatus('running');
		await setStatus('done');
		const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
		return { count: counter.get(), snapshots, total, tagged, status, fact: fact(10) };
	},
});
