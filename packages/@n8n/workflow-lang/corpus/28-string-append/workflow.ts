/**
 * `s += x` in a loop builds a 1 MiB string in linear time (the runtime's
 * string buffers). Strings stay values: a copy taken in the loop keeps its
 * length and text after later appends, and an append to an older string
 * does not change the newer one.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ chunk: string }>({ path: 'append' })],
	async run(_ctx, trigger) {
		const chunk = trigger.body.chunk;
		let s = '';
		let kept = '';
		for (let i = 0; i < 65536; i++) {
			s += chunk;
			if (i === 1000) kept = s;
		}
		// Appends to the kept prefix go to a new buffer: `s` keeps its text.
		const fork = `${kept}!`;
		let sum = 0;
		for (let i = 0; i < s.length; i += 4099) sum = (sum + s.charCodeAt(i)) % 65521;
		return {
			length: s.length,
			keptLength: kept.length,
			forkTail: fork.slice(-3),
			afterFork: s.slice(kept.length, kept.length + 4),
			sum,
			unicode: `${'ü'.repeat(40)}😀`.length + ('a'.repeat(70) + 'ü').length,
		};
	},
});
