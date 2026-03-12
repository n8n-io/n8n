/**
 * 16 - Pausable Workflow
 *
 * A multi-step workflow designed to be paused and resumed.
 * Each step takes 1-2 seconds, giving time to pause between steps.
 * Shows how the engine holds execution at step boundaries.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '16 - Pausable Workflow',
	async run(ctx) {
		const step1 = await ctx.step(
			{
				name: 'Phase 1: Initialize',
				icon: 'play',
				color: '#3b82f6',
				description: 'Initializes the process',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 1500));
				return { phase: 1, status: 'initialized', timestamp: Date.now() };
			},
		);

		const step2 = await ctx.step(
			{
				name: 'Phase 2: Process',
				icon: 'cog',
				color: '#8b5cf6',
				description: 'Core processing phase',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 1500));
				return { phase: 2, status: 'processed', previous: step1.status, timestamp: Date.now() };
			},
		);

		await ctx.step(
			{
				name: 'Phase 3: Validate',
				icon: 'check-circle',
				color: '#eab308',
				description: 'Validates processed data',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 1500));
				return { phase: 3, status: 'validated', previous: step2.status, timestamp: Date.now() };
			},
		);

		const step4 = await ctx.step(
			{
				name: 'Phase 4: Finalize',
				icon: 'flag',
				color: '#22c55e',
				description: 'Marks process complete',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 1000));
				return {
					phase: 4,
					status: 'complete',
					totalDuration: Date.now() - step1.timestamp,
					timestamp: Date.now(),
				};
			},
		);

		return step4;
	},
});
