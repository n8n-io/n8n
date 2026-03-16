/**
 * F24: Execution with Pin Data Only
 *
 * Demonstrates a simple two-step chain where each step returns
 * hardcoded values (simulating pin-data in the v4 test harness).
 * The pin-data concept doesn't apply in v3 — we use regular
 * return values instead.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F24 - Exec Pindata Only',
	triggers: [webhook('/f24-exec-pindata-only', { method: 'POST' })],
	async run(ctx) {
		const values = await ctx.step(
			{ name: 'Set Values', icon: 'settings', color: '#6b7280' },
			async () => {
				return { greeting: 'hello' };
			},
		);

		const formatted = await ctx.step(
			{ name: 'Format Output', icon: 'file-text', color: '#22c55e' },
			async () => {
				return { message: values.greeting };
			},
		);

		return formatted;
	},
});
