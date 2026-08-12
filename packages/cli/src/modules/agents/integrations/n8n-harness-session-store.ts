import type {
	HarnessSessionClaim,
	HarnessSessionScope,
	HarnessSessionState,
	HarnessSessionStore,
	HarnessAgentContinueTurnState,
	HarnessAgentResumeSessionState,
} from '@n8n/agents/harness';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { jsonParse, OperationalError, UserError } from 'n8n-workflow';

import {
	AgentHarnessSessionRepository,
	type AgentHarnessSessionClaimHandle,
} from '../repositories/agent-harness-session.repository';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isHarnessResumeState(value: unknown): value is HarnessAgentResumeSessionState {
	return (
		isRecord(value) &&
		value.type === 'resume-session' &&
		typeof value.harnessId === 'string' &&
		value.specificationVersion === 'harness-v1' &&
		'data' in value
	);
}

function isHarnessContinueState(value: unknown): value is HarnessAgentContinueTurnState {
	return (
		isRecord(value) &&
		value.type === 'continue-turn' &&
		typeof value.harnessId === 'string' &&
		value.specificationVersion === 'harness-v1' &&
		'data' in value
	);
}

function deserializeState(sessionId: string, serializedState: string | null): HarnessSessionState {
	if (!serializedState) return { sessionId };

	const state = jsonParse<unknown>(serializedState, { fallbackValue: undefined });
	if (isHarnessResumeState(state)) return { sessionId, resumeFrom: state };
	if (isHarnessContinueState(state)) return { sessionId, continueFrom: state };
	throw new OperationalError('Stored harness session state is invalid');
}

function serializeState(state: HarnessSessionState): string | null {
	if (state.resumeFrom && state.continueFrom) {
		throw new OperationalError('Harness session state cannot resume and continue at the same time');
	}
	const lifecycleState = state.resumeFrom ?? state.continueFrom;
	return lifecycleState ? JSON.stringify(lifecycleState) : null;
}

@Service()
export class N8nHarnessSessionStore implements HarnessSessionStore {
	constructor(
		private readonly repository: AgentHarnessSessionRepository,
		private readonly config: AgentsConfig,
	) {}

	async claim(
		scope: HarnessSessionScope,
		options?: { abortSignal?: AbortSignal },
	): Promise<HarnessSessionClaim> {
		if (!this.config.modules.includes('harnesses')) {
			throw new UserError('Harness agents are not enabled on this instance');
		}
		options?.abortSignal?.throwIfAborted();

		const claimToken = randomUUID();
		const sessionId = randomUUID();
		const row = await this.repository.acquire(
			{
				agentId: scope.agentId,
				threadId: scope.threadId,
				runtimeIdentity: scope.runtimeIdentity,
			},
			{
				adapter: scope.adapter,
				resourceId: scope.resourceId,
				sessionId,
				claimToken,
				claimTtlMs: this.config.harnessClaimTtlSeconds * 1000,
				sessionTtlMs: this.config.harnessSessionTtlSeconds * 1000,
			},
		);
		if (!row) {
			throw new UserError('This harness conversation is already processing another turn');
		}
		const handle: AgentHarnessSessionClaimHandle = {
			agentId: row.agentId,
			threadId: row.threadId,
			runtimeIdentity: row.runtimeIdentity,
			claimToken,
			ownershipEpoch: row.ownershipEpoch,
		};
		if (options?.abortSignal?.aborted) {
			await this.repository.release(handle);
			options.abortSignal.throwIfAborted();
		}
		if (row.adapter !== scope.adapter) {
			await this.repository.release(handle);
			throw new OperationalError('Stored harness session belongs to a different adapter');
		}

		try {
			return this.createClaim(handle, deserializeState(row.sessionId, row.state));
		} catch (error) {
			await this.repository.release(handle);
			throw error;
		}
	}

	private createClaim(
		handle: AgentHarnessSessionClaimHandle,
		state: HarnessSessionState,
	): HarnessSessionClaim {
		let cleared = false;
		let released = false;
		let renewing = false;
		const ownershipAbort = new AbortController();
		const claimTtlMs = this.config.harnessClaimTtlSeconds * 1000;
		const renewalTimer = setInterval(
			() => {
				if (renewing || cleared || released || ownershipAbort.signal.aborted) return;
				renewing = true;
				void this.repository
					.renew(handle, claimTtlMs)
					.then((owned) => {
						if (!owned)
							ownershipAbort.abort(new OperationalError('Harness session ownership was lost'));
					})
					.catch((error: unknown) => ownershipAbort.abort(error))
					.finally(() => {
						renewing = false;
					});
			},
			Math.max(1000, Math.floor(claimTtlMs / 3)),
		);
		renewalTimer.unref();

		const requireActive = () => {
			ownershipAbort.signal.throwIfAborted();
			if (cleared || released) {
				throw new OperationalError('Harness session claim is no longer active');
			}
		};
		const requireOwned = (owned: boolean) => {
			if (!owned) throw new OperationalError('Harness session ownership was lost');
		};

		return {
			state,
			fence: {
				ownershipEpoch: handle.ownershipEpoch,
				claimToken: handle.claimToken,
			},
			abortSignal: ownershipAbort.signal,
			renew: async () => {
				requireActive();
				requireOwned(await this.repository.renew(handle, claimTtlMs));
			},
			save: async (nextState) => {
				requireActive();
				if (nextState.sessionId !== state.sessionId) {
					throw new OperationalError('Harness session identifier changed during a claimed turn');
				}
				requireOwned(
					await this.repository.saveClaimedState(
						handle,
						{
							sessionId: nextState.sessionId,
							serializedState: serializeState(nextState),
						},
						this.config.harnessSessionTtlSeconds * 1000,
					),
				);
			},
			clear: async () => {
				requireActive();
				requireOwned(await this.repository.deleteClaimed(handle));
				cleared = true;
				clearInterval(renewalTimer);
			},
			release: async () => {
				if (released) return;
				released = true;
				clearInterval(renewalTimer);
				if (!cleared) {
					const owned = await this.repository.release(handle);
					if (!owned && !ownershipAbort.signal.aborted) requireOwned(false);
				}
			},
		};
	}
}
