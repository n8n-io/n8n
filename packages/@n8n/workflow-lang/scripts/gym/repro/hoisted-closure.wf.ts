/** Repro: a function declaration that reads a `let` of the run, which changes before the call. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'repro', method: 'POST' })],
	async run() {
		let items = 0;
		function read(): number {
			return items;
		}
		items = 5;
		return read();
	},
});
