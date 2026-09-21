import { toValue, type MaybeRefOrGetter } from 'vue';
import { v4 as uuid } from 'uuid';
import { instanceAiSetupRequirementId } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import type { INodeUi } from '@/Interface';

export type SetupConnectionPayload = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION
>;
export type SetupConnectionMethod = SetupConnectionPayload['method'];
export type SetupConnectionError = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CREDENTIALS.USER_FAILED_CREDENTIAL_CONNECTION
>['error_type'];
export type SetupConnectionCancellation = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CREDENTIALS.USER_CANCELLED_CREDENTIAL_CONNECTION
>['reason'];

const editedParameters = new Set<string>();

export function useWorkflowSetupTracking(options: {
	workflowId: MaybeRefOrGetter<string | undefined>;
	threadId: MaybeRefOrGetter<string>;
	source: SetupConnectionPayload['source'];
	attempts?: Map<string, SetupConnectionPayload[]>;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const attempts = options.attempts ?? new Map<string, SetupConnectionPayload[]>();
	const context = () => ({
		session_id: rootStore.pushRef,
		workflow_id: toValue(options.workflowId) ?? '',
		thread_id: toValue(options.threadId),
	});

	function start(
		key: string,
		credentialType: string,
		method: SetupConnectionMethod,
		nodes: Array<Pick<INodeUi, 'id' | 'type'>>,
	) {
		cancel(key, 'superseded');
		const attemptId = uuid();
		const base = {
			...context(),
			source: options.source,
			credential_type: credentialType,
			method,
			attempt_id: attemptId,
		};
		const payloads = nodes.length
			? nodes.map((node) => ({
					...base,
					item_id: instanceAiSetupRequirementId(
						base.workflow_id,
						node.id,
						'credential',
						credentialType,
					),
					node_type: node.type,
				}))
			: [base];
		attempts.set(key, payloads);
		for (const payload of payloads)
			telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION, payload);
	}

	function complete(
		key: string,
		credentialId: string | null,
		bindingState: 'applied' | 'noop' | 'queued',
		nodes: Array<Pick<INodeUi, 'id' | 'type'>> = [],
	) {
		const payloads = (attempts.get(key) ?? []).flatMap((payload) =>
			!payload.item_id && nodes.length
				? nodes.map((node) => ({
						...payload,
						node_type: node.type,
						item_id: instanceAiSetupRequirementId(
							payload.workflow_id,
							node.id,
							'credential',
							payload.credential_type,
						),
					}))
				: [payload],
		);
		for (const payload of payloads)
			telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION, {
				...payload,
				credential_id: credentialId,
				binding_state: bindingState,
			});
		attempts.delete(key);
	}

	function fail(key: string, errorType: SetupConnectionError) {
		for (const payload of attempts.get(key) ?? [])
			telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_FAILED_CREDENTIAL_CONNECTION, {
				...payload,
				error_type: errorType,
			});
		attempts.delete(key);
	}

	function cancel(key: string, reason: SetupConnectionCancellation) {
		for (const payload of attempts.get(key) ?? [])
			telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_CANCELLED_CREDENTIAL_CONNECTION, {
				...payload,
				reason,
			});
		attempts.delete(key);
	}

	function parameterStarted(node: Pick<INodeUi, 'id' | 'type'>, parameterName: string) {
		const payload = context();
		if (!payload.workflow_id) return;
		const itemId = instanceAiSetupRequirementId(
			payload.workflow_id,
			node.id,
			'parameter',
			parameterName,
		);
		const key = `${payload.session_id}:${payload.thread_id}:${itemId}`;
		if (editedParameters.has(key)) return;
		editedParameters.add(key);
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_PARAMETER_SETUP, {
			...payload,
			item_id: itemId,
			node_type: node.type,
			parameter_name: parameterName,
			source: options.source,
		});
	}

	return {
		context,
		start,
		complete,
		fail,
		cancel,
		parameterStarted,
		hasAttempt: (key: string) => attempts.has(key),
	};
}
