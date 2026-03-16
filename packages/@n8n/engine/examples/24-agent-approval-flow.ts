/**
 * Example 24: Agent Approval Flow
 *
 * Demonstrates an agent step that suspends execution when a tool
 * requires human approval (human-in-the-loop). The engine persists
 * the agent's state, and when approval is granted via the resume
 * endpoint, the agent picks up where it left off.
 *
 * Flow:
 *   1. Prepare context → 2. Agent runs (may suspend for approval)
 *   3. If suspended: engine pauses, waits for POST /resume
 *   4. Agent resumes with approval data → completes
 *   5. Format result
 */
import { defineWorkflow } from '@n8n/engine/sdk';
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

// A tool that requires human approval before executing.
// .suspend() and .resume() schemas mark it as interruptible — the framework
// will provide ctx.suspend/ctx.resumeData to the handler at runtime.
const deployTool = new Tool('deploy')
	.description('Deploy code to production. Requires human approval.')
	.input(z.object({ service: z.string(), version: z.string() }))
	.suspend(z.object({ message: z.string(), service: z.string(), version: z.string() }))
	.resume(z.object({ approved: z.boolean() }))
	.handler(async ({ service, version }, ctx) => {
		// First invocation: suspend for human approval
		if (!ctx.resumeData) {
			return await ctx.suspend({
				message: `Approve deployment of ${service} v${version} to production?`,
				service,
				version,
			});
		}

		// Resumed with approval decision
		if (!ctx.resumeData.approved) {
			return { status: 'rejected', service, version };
		}

		return {
			status: 'deployed',
			service,
			version,
			timestamp: new Date().toISOString(),
		};
	});

export default defineWorkflow({
	name: 'Agent Approval Flow',
	async run(ctx) {
		const context = await ctx.step({ name: 'Prepare Deploy' }, async () => ({
			service: 'api-gateway',
			version: '2.4.0',
			changes: ['Fixed auth bug', 'Added rate limiting', 'Updated dependencies'],
		}));

		const result = await ctx.agent(
			new Agent('deploy-assistant')
				.model('anthropic', 'claude-sonnet-4-5')
				.instructions(
					'You are a deployment assistant. Review the changes and use the deploy tool ' +
						'to deploy the service. The deploy tool requires human approval.',
				)
				.tool(deployTool)
				.checkpoint('memory'),
			`Deploy ${context.service} v${context.version}. Changes: ${context.changes.join(', ')}`,
		);

		return await ctx.step({ name: 'Record Deployment' }, async () => ({
			service: context.service,
			version: context.version,
			agentStatus: result.status,
			output: result.output,
			suspended: result.status === 'suspended',
		}));
	},
});
