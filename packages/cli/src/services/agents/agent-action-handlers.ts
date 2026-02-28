import { jsonStringify } from 'n8n-workflow';

import { callExternalAgent } from './agent-external-client';
import type { ExecutionContext, ParsedAction, ActionOutcome } from './agent-execution-types';

export async function handleExecuteWorkflow(
	ctx: ExecutionContext,
	parsed: ParsedAction,
	callerId?: string,
	workflowCredentials?: Record<string, Record<string, string>>,
	prompt?: string,
): Promise<ActionOutcome> {
	const capWorkflow = ctx.workflows.find((w) => w.id === parsed.workflowId);
	const workflowName = capWorkflow?.name ?? parsed.workflowId!;

	ctx.steps.push({ action: 'execute_workflow', workflowName });
	ctx.onStep?.({
		type: 'task.action',
		action: 'execute_workflow',
		workflowName,
		reasoning: parsed.reasoning,
	});

	try {
		const result = await ctx.deps.runWorkflow(
			ctx.agentUser,
			parsed.workflowId!,
			prompt,
			callerId,
			workflowCredentials,
			parsed.inputs,
		);
		const stepResult = result.success ? 'success' : 'failed';
		return {
			kind: 'observed',
			action: 'execute_workflow',
			result: stepResult,
			message: `Workflow "${workflowName}" executed. Result: ${jsonStringify(result).slice(0, 2000)}`,
			extra: { workflowName },
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		return {
			kind: 'observed',
			action: 'execute_workflow',
			result: 'error',
			message: `Workflow execution failed: ${errorMsg}`,
			extra: { workflowName, error: errorMsg },
		};
	}
}

export async function handleDelegateExternal(
	ctx: ExecutionContext,
	parsed: ParsedAction,
	targetName: string,
): Promise<ActionOutcome> {
	const externalAgent = ctx.resolvedExternalAgents.find(
		(a) => `external:${a.name}` === parsed.targetUserId,
	);

	if (!externalAgent) {
		return {
			kind: 'observed',
			action: 'delegate',
			result: 'error',
			message: `External agent "${targetName}" not found.`,
			extra: { targetUserName: targetName, error: 'Agent not found' },
		};
	}

	try {
		const result = await callExternalAgent(externalAgent, parsed.message!);
		const stepResult = result.status === 'completed' ? 'success' : 'failed';
		return {
			kind: 'observed',
			action: 'delegate',
			result: stepResult,
			message: `Agent "${targetName}" responded: ${result.summary ?? 'No summary'}`,
			extra: { targetUserName: targetName, summary: result.summary, origin: 'external' },
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		return {
			kind: 'observed',
			action: 'delegate',
			result: 'error',
			message: `External agent delegation failed: ${errorMsg}`,
			extra: { targetUserName: targetName, error: errorMsg, origin: 'external' },
		};
	}
}

export async function handleDelegateInternal(
	ctx: ExecutionContext,
	parsed: ParsedAction,
	targetName: string,
	callChain: Set<string>,
	byokApiKey?: string,
	callerId?: string,
	workflowCredentials?: Record<string, Record<string, string>>,
): Promise<ActionOutcome> {
	const targetAgent = await ctx.deps.findAgentUser(parsed.targetUserId!);

	if (!targetAgent) {
		return {
			kind: 'observed',
			action: 'delegate',
			result: 'error',
			message: `Agent "${targetName}" not found. Available agents: ${ctx.otherAgents.map((a) => `${a.firstName} (id: ${a.id})`).join(', ')}`,
			extra: { targetUserName: targetName, error: 'Agent not found' },
		};
	}

	if (targetAgent.agentAccessLevel === 'closed') {
		return {
			kind: 'observed',
			action: 'delegate',
			result: 'error',
			message: `Agent "${targetName}" is not accessible.`,
			extra: { targetUserName: targetName, error: 'Agent not accessible' },
		};
	}

	try {
		await ctx.deps.enforceAccessLevel(targetAgent.id, ctx.agentUser);
		const result = await ctx.deps.executeAgentTask(targetAgent.id, parsed.message!, ctx.budget, {
			onStep: ctx.onStep,
			callChain,
			byokApiKey,
			callerId,
			workflowCredentials,
		});
		const stepResult = result.status === 'completed' ? 'success' : 'failed';
		const responseText = result.summary ?? result.message ?? 'No summary';
		return {
			kind: 'observed',
			action: 'delegate',
			result: stepResult,
			message: `Agent "${targetName}" responded: ${responseText}`,
			extra: { targetUserName: targetName, summary: responseText },
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		return {
			kind: 'observed',
			action: 'delegate',
			result: 'error',
			message: `Agent delegation failed: ${errorMsg}`,
			extra: { targetUserName: targetName, error: errorMsg },
		};
	}
}

export async function handleComplete(
	ctx: ExecutionContext,
	parsed: ParsedAction,
	originalPrompt: string,
): Promise<ActionOutcome> {
	const reflectionResult = await ctx.deps.reflectBeforeComplete(
		ctx.messages,
		ctx.llmConfig,
		originalPrompt,
		parsed.summary ?? 'Task completed',
		ctx.steps,
		ctx.budget,
	);
	if (reflectionResult) {
		return { kind: 'completed', result: reflectionResult };
	}
	return { kind: 'continue_loop' };
}

export async function dispatchAction(
	ctx: ExecutionContext,
	parsed: ParsedAction,
	prompt: string,
	callChain: Set<string>,
	byokApiKey?: string,
	callerId?: string,
	workflowCredentials?: Record<string, Record<string, string>>,
): Promise<ActionOutcome> {
	if (parsed.action === 'complete') {
		return await handleComplete(ctx, parsed, prompt);
	}

	if (parsed.action === 'execute_workflow' && parsed.workflowId) {
		return await handleExecuteWorkflow(ctx, parsed, callerId, workflowCredentials, prompt);
	}

	if (parsed.action === 'delegate' && parsed.targetUserId && parsed.message && ctx.canDelegate) {
		const targetAgentInfo = ctx.otherAgents.find((a) => a.id === parsed.targetUserId);
		const targetName = targetAgentInfo?.firstName ?? parsed.targetUserId;
		const isExternal = parsed.targetUserId.startsWith('external:');

		ctx.steps.push({ action: 'delegate', targetUserName: targetName });
		ctx.onStep?.({
			type: 'task.action',
			action: 'delegate',
			targetUserName: targetName,
			...(isExternal ? { origin: 'external' } : {}),
		});

		if (isExternal) {
			return await handleDelegateExternal(ctx, parsed, targetName);
		}
		return await handleDelegateInternal(
			ctx,
			parsed,
			targetName,
			callChain,
			byokApiKey,
			callerId,
			workflowCredentials,
		);
	}

	const validActions = ctx.canDelegate
		? '"execute_workflow", "delegate", or "complete"'
		: '"execute_workflow" or "complete"';
	return { kind: 'unknown_action', validActions };
}
