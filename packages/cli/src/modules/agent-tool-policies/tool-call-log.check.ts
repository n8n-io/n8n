import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type {
	PolicyCheckResult,
	PreToolExecutionContext,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';

/**
 * Logs each tool call that an agent is about to run, and allows it. This is the first check
 * at the `preToolExecution` point. It shows what a tool call policy has to decide on.
 */
@PolicyCheck()
export class ToolCallLogCheck implements RegisteredPolicyCheck {
	readonly id = 'agent-tool-call-log';

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('policy');
	}

	async onPreToolExecution(context: PreToolExecutionContext): Promise<PolicyCheckResult> {
		const { runToolCalls, sessionHistory: _, ...call } = context;
		// The input is not redacted. Do not raise the level of this line.
		this.logger.debug(`Agent tool call: ${context.tool.name}`, {
			context: { ...call, runToolCalls: runToolCalls() },
		});
		this.logSessionHistory(context);

		// TODO: Implement the policy logics
		return await Promise.resolve({ violations: [] });
	}

	/**
	 * Not awaited. The stored history costs queries, and a slow read must not use up the
	 * deadline of the check and block the tool call.
	 */
	private logSessionHistory({ tool, toolCallId, sessionHistory }: PreToolExecutionContext) {
		// Nothing writes the line at another level, so the read is skipped.
		if (this.globalConfig.logging.level !== 'debug') return;

		void sessionHistory().then(
			(history) =>
				this.logger.debug(`Agent tool call history: ${tool.name}`, {
					toolCallId,
					sessionHistory: history,
				}),
			(error: unknown) =>
				this.logger.debug(`Could not read the agent tool call history: ${tool.name}`, {
					toolCallId,
					error,
				}),
		);
	}
}
