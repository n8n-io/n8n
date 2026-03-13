/**
 * 14 - Reference Error
 *
 * Demonstrates how the engine handles JavaScript reference errors
 * (non-retriable). The step tries to access an undefined variable,
 * causing an immediate failure with no retry.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '14 - Reference Error',
	async run(ctx) {
		await ctx.step(
			{
				name: 'Setup Data',
				icon: 'settings',
				color: '#6b7280',
				description: 'Initializes test data',
			},
			async () => {
				return { items: [1, 2, 3] };
			},
		);

		const broken = await ctx.step(
			{
				name: 'Access Undefined Variable',
				icon: 'bug',
				color: '#ef4444',
				description: 'Intentional ReferenceError',
			},
			async () => {
				// This will throw a ReferenceError — non-retriable
				// @ts-expect-error intentional reference to undefined variable
				return (undefinedVariable as unknown as Record<string, unknown>).property;
			},
		);

		return broken;
	},
});
