import type {
	ComputerUseChannel,
	InstanceAiBuildMode,
	InstanceAiPromptConfiguration,
	InstanceAiCredentialDestinationDecision,
} from '@n8n/api-types';

/**
 * Flat confirmation payload consumed by native tool `resumeSchema`s and sub-agent HITL.
 * The service layer constructs this from the typed `InstanceAiConfirmRequest` discriminated
 * union sent by the frontend — only one subset of fields is populated per call, matching
 * the confirmation kind that was originally requested.
 */
export interface ConfirmationData {
	approved: boolean;
	credentials?: Record<string, string>;
	nodeCredentials?: Record<string, Record<string, string>>;
	userInput?: string;
	domainAccessAction?: string;
	action?: 'apply' | 'test-trigger';
	nodeParameters?: Record<string, Record<string, unknown>>;
	/** Workflow-setup cards the user actively skipped, by node name. */
	skippedNodes?: string[];
	testTriggerNode?: string;
	answers?: Array<{
		questionId: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}>;
	/** User's resource-access decision (e.g. 'allowForSession'). */
	resourceDecision?: string;
	/** Plan-review hard denial — distinct from a feedback-driven rejection. */
	denied?: boolean;
	/** `'session'` means the user chose "always allow": the resuming tool should
	 *  persist a thread-level grant so the same action isn't re-asked. */
	scope?: 'once' | 'session';
	autoSetup?: { credentialType: string; attemptId?: string };
	credentialDestination?: InstanceAiCredentialDestinationDecision;
	connectedSlugs?: string[];
}

/**
 * Per-thread state that follow-up turns reuse: request options the client sent
 * on the user turn, and the message-group index of runs. The Agents runtime
 * owns the run lifecycle itself.
 */
export class RunStateRegistry {
	private readonly threadMessageGroupId = new Map<string, string>();

	private readonly runIdsByMessageGroup = new Map<string, string[]>();

	/** IANA time zone captured at initial-run entry and reused by follow-up runs. */
	private readonly threadTimeZones = new Map<string, string>();

	/** Computer Use entries the client reported, reused by follow-up runs. Only the
	 *  client can see its own rollout and the device, and a follow-up run has no
	 *  request of its own to ask. */
	private readonly threadComputerUseChannels = new Map<string, ComputerUseChannel[]>();

	/** Build mode captured at user-run entry and reused by follow-up runs. */
	private readonly threadBuildModes = new Map<string, InstanceAiBuildMode>();
	private readonly threadSetupPanelEnabled = new Map<string, boolean>();

	private readonly threadObserverThresholds = new Map<string, number>();
	private readonly threadPromptSelections = new Map<
		string,
		{ version: string; metadata?: InstanceAiPromptConfiguration }
	>();

	/**
	 * Seed the message-group indexes for a run: map the thread to its current
	 * group and record the run under that group. Idempotent.
	 */
	indexRunInGroup(threadId: string, messageGroupId: string, runId: string): void {
		this.threadMessageGroupId.set(threadId, messageGroupId);
		let groupRunIds = this.runIdsByMessageGroup.get(messageGroupId);
		if (!groupRunIds) {
			groupRunIds = [];
			this.runIdsByMessageGroup.set(messageGroupId, groupRunIds);
		}
		if (!groupRunIds.includes(runId)) groupRunIds.push(runId);
	}

	getMessageGroupId(threadId: string): string | undefined {
		return this.threadMessageGroupId.get(threadId);
	}

	getRunIdsForMessageGroup(messageGroupId: string): string[] {
		return this.runIdsByMessageGroup.get(messageGroupId) ?? [];
	}

	setTimeZone(threadId: string, timeZone: string): void {
		this.threadTimeZones.set(threadId, timeZone);
	}

	getTimeZone(threadId: string): string | undefined {
		return this.threadTimeZones.get(threadId);
	}

	/** An omitted list clears it, so a client that stops reporting advertises nothing. */
	setComputerUseChannels(threadId: string, channels: ComputerUseChannel[] | undefined): void {
		if (channels === undefined) this.threadComputerUseChannels.delete(threadId);
		else this.threadComputerUseChannels.set(threadId, channels);
	}

	getComputerUseChannels(threadId: string): ComputerUseChannel[] | undefined {
		return this.threadComputerUseChannels.get(threadId);
	}

	/** Retain the request mode for internal follow-ups. An omitted mode clears it. */
	setBuildMode(threadId: string, buildMode: InstanceAiBuildMode | undefined): void {
		if (buildMode === undefined) this.threadBuildModes.delete(threadId);
		else this.threadBuildModes.set(threadId, buildMode);
	}

	getBuildMode(threadId: string): InstanceAiBuildMode | undefined {
		return this.threadBuildModes.get(threadId);
	}

	setSetupPanelEnabled(threadId: string, enabled: boolean): void {
		this.threadSetupPanelEnabled.set(threadId, enabled);
	}

	isSetupPanelEnabled(threadId: string): boolean {
		return this.threadSetupPanelEnabled.get(threadId) === true;
	}

	/** Per-thread observer threshold; an omitted value clears it. */
	setObserverThresholdTokens(threadId: string, tokens: number | undefined): void {
		if (tokens === undefined) this.threadObserverThresholds.delete(threadId);
		else this.threadObserverThresholds.set(threadId, tokens);
	}

	getObserverThresholdTokens(threadId: string): number | undefined {
		return this.threadObserverThresholds.get(threadId);
	}

	setPromptVersion(threadId: string, version: string | undefined): void {
		if (version === undefined) this.threadPromptSelections.delete(threadId);
		else this.threadPromptSelections.set(threadId, { version });
	}

	getPromptVersion(threadId: string): string | undefined {
		return this.threadPromptSelections.get(threadId)?.version;
	}

	setPromptConfiguration(threadId: string, metadata: InstanceAiPromptConfiguration): void {
		this.threadPromptSelections.set(threadId, { version: metadata.version, metadata });
	}

	getPromptConfiguration(threadId: string): InstanceAiPromptConfiguration | undefined {
		return this.threadPromptSelections.get(threadId)?.metadata;
	}

	/** Remove all per-thread state. */
	clearThread(threadId: string): void {
		this.threadTimeZones.delete(threadId);
		this.threadComputerUseChannels.delete(threadId);
		this.threadBuildModes.delete(threadId);
		this.threadSetupPanelEnabled.delete(threadId);
		this.threadObserverThresholds.delete(threadId);
		this.threadPromptSelections.delete(threadId);

		const groupId = this.threadMessageGroupId.get(threadId);
		if (groupId) this.runIdsByMessageGroup.delete(groupId);
		this.threadMessageGroupId.delete(threadId);
	}

	clear(): void {
		this.threadTimeZones.clear();
		this.threadComputerUseChannels.clear();
		this.threadBuildModes.clear();
		this.threadSetupPanelEnabled.clear();
		this.threadObserverThresholds.clear();
		this.threadPromptSelections.clear();
		this.threadMessageGroupId.clear();
		this.runIdsByMessageGroup.clear();
	}
}
