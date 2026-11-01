import {
	SKILL_LOAD_TOOL_NAME,
	findRuntimeSkillEntry,
	isMainSkillFilePath,
	type RuntimeSkillContextUsage,
	type RuntimeSkillSource,
} from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { HubSkillTelemetryState } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

/** One cumulative snapshot per logical Assistant run, including its resumed segments. */
export class InstanceAiSkillTelemetry {
	private readonly state: HubSkillTelemetryState;
	private source?: RuntimeSkillSource;

	constructor(
		private readonly agentId: string,
		saved?: HubSkillTelemetryState,
	) {
		this.state = saved ? structuredClone(saved) : { sequence: 0, calls: [], context: [] };
	}

	bind(source?: RuntimeSkillSource): void {
		this.source = source;
		if (source) source.onContext = (usage) => this.observeContext(usage);
	}

	observe(event: InstanceAiEvent): void {
		if (event.agentId !== this.agentId) return;
		if (event.type === 'tool-call' && event.payload.toolName === SKILL_LOAD_TOOL_NAME) {
			const { toolCallId, args } = event.payload;
			if (this.state.calls.some(({ key }) => key === toolCallId)) return;
			const entry =
				this.source &&
				findRuntimeSkillEntry(this.source.registry, {
					skillId: typeof args.skillId === 'string' ? args.skillId : undefined,
					name: typeof args.name === 'string' ? args.name : undefined,
				});
			const runtimeSkillId = entry?.id ?? args.skillId;
			if (typeof runtimeSkillId !== 'string' || !this.isHubSkill(runtimeSkillId)) return;
			const path = typeof args.filePath === 'string' ? args.filePath.trim() : '';
			this.state.calls.push({
				key: toolCallId,
				runtimeSkillId,
				skillId: this.hubId(runtimeSkillId),
				kind: isMainSkillFilePath(path) ? 'main' : 'reference',
				outcome: 'pending',
			});
			return;
		}
		if (event.type !== 'tool-result' && event.type !== 'tool-error') return;
		const call = this.state.calls.find(({ key }) => key === event.payload.toolCallId);
		if (!call || call.outcome !== 'pending') return;
		if (event.type === 'tool-error') {
			call.outcome = 'failure';
			call.reason = 'tool_error';
			return;
		}
		const result = event.payload.result;
		if (isRecord(result) && (result.success === true || result.type === 'content')) {
			call.outcome = 'success';
			return;
		}
		call.outcome = 'failure';
		const code = isRecord(result) ? result.errorCode : undefined;
		call.reason =
			code === 'temporarily_unavailable' || code === 'invalid_reference' ? code : 'unavailable';
	}

	private observeContext(usage: RuntimeSkillContextUsage[]): void {
		for (const item of usage) {
			if (!this.isHubSkill(item.skillId)) continue;
			// Rebuilding a paused runtime must not turn an initial load or refresh into reuse.
			if (
				item.kind === 'carried' &&
				(this.state.calls.some(
					(call) =>
						call.runtimeSkillId === item.skillId &&
						call.kind === 'main' &&
						call.outcome === 'success',
				) ||
					this.state.context.some(
						(context) => context.runtimeSkillId === item.skillId && context.kind === 'refreshed',
					))
			)
				continue;
			if (
				this.state.context.some(
					(context) =>
						context.runtimeSkillId === item.skillId &&
						context.kind === item.kind &&
						context.version === item.version,
				)
			)
				continue;
			this.state.context.push({
				runtimeSkillId: item.skillId,
				skillId: this.hubId(item.skillId),
				kind: item.kind,
				version: item.version,
			});
		}
	}

	private hubId(runtimeId: string): string | undefined {
		const id = this.source?.registry.skills.find(({ id }) => id === runtimeId)?.metadata
			?.hubSkillId;
		return typeof id === 'string' ? id : undefined;
	}

	private isHubSkill(id: string): boolean {
		return (
			this.hubId(id) !== undefined ||
			(/^hub-[a-f0-9]{64}$/.test(id) &&
				!this.source?.registry.skills.some((skill) => skill.id === id))
		);
	}

	save(): HubSkillTelemetryState {
		return structuredClone(this.state);
	}

	snapshot() {
		this.state.sequence++;
		const ids = (values: Array<{ skillId?: string }>) =>
			[...new Set(values.flatMap(({ skillId }) => skillId ?? []))].sort();
		const loads = this.state.calls.filter(({ kind }) => kind === 'main');
		const references = this.state.calls.filter(({ kind }) => kind === 'reference');
		const count = (kind: RuntimeSkillContextUsage['kind']) =>
			this.state.context.filter((item) => item.kind === kind).length;
		const failures = this.state.calls.filter(({ outcome }) => outcome === 'failure');
		return {
			hub_skill_snapshot_sequence: this.state.sequence,
			hub_skill_attempt_count: loads.length,
			hub_skill_attempted_ids: ids(loads),
			hub_skill_load_count: loads.filter(({ outcome }) => outcome === 'success').length,
			hub_skill_loaded_ids: ids(loads.filter(({ outcome }) => outcome === 'success')),
			hub_skill_failure_count: loads.filter(({ outcome }) => outcome === 'failure').length,
			hub_skill_carried_count: count('carried'),
			hub_skill_carried_ids: ids(this.state.context.filter(({ kind }) => kind === 'carried')),
			hub_skill_refresh_count: count('refreshed'),
			hub_skill_refreshed_ids: ids(this.state.context.filter(({ kind }) => kind === 'refreshed')),
			hub_skill_revocation_count: count('revoked'),
			hub_skill_unavailable_count: count('unavailable'),
			hub_skill_reference_attempt_count: references.length,
			hub_skill_reference_read_count: references.filter(({ outcome }) => outcome === 'success')
				.length,
			hub_skill_reference_failure_count: references.filter(({ outcome }) => outcome === 'failure')
				.length,
			hub_skill_failures: (['main', 'reference'] as const).flatMap((operation) =>
				(
					['temporarily_unavailable', 'unavailable', 'invalid_reference', 'tool_error'] as const
				).flatMap((reason) => {
					const count = failures.filter(
						(call) => call.kind === operation && call.reason === reason,
					).length;
					return count ? [{ operation, reason, count }] : [];
				}),
			),
		};
	}
}
