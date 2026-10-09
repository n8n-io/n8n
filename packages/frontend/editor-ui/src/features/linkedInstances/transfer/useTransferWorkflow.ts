import type {
	LinkedInstancePushResult,
	LinkedInstanceTransferPreflight,
	LinkedInstanceTransferRequestDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, watch, type WatchSource } from 'vue';

import { requestErrorMessage } from '../composables/useTokenRequest';
import { fetchTransferPreflight, moveWorkflow } from './transfer.api';

export type PreflightState =
	| { status: 'checking' }
	| { status: 'ready'; preflight: LinkedInstanceTransferPreflight }
	| { status: 'failed'; message: string };

/** One opening of the dialog: the link and the workflow that it moves. */
export interface TransferSubject {
	linkId: string;
	workflowId: string;
}

interface TransferMessages {
	checkFailed: () => string;
	moveFailed: () => string;
}

/**
 * The requests of the move dialog. The preflight runs each time the dialog opens. A request that
 * ends after the dialog closed, or after it opened again, changes nothing.
 */
export function useTransferWorkflow(
	open: WatchSource<boolean>,
	subject: () => TransferSubject,
	messages: TransferMessages,
) {
	const rootStore = useRootStore();
	const preflight = ref<PreflightState>({ status: 'checking' });
	const isMoving = ref(false);
	const moveError = ref<string>();

	// Changes on every open, close and check. A request reports back only while its turn is current.
	let turn = 0;

	async function check(): Promise<void> {
		const current = ++turn;
		preflight.value = { status: 'checking' };
		moveError.value = undefined;
		const { linkId, workflowId } = subject();
		try {
			const result = await fetchTransferPreflight(rootStore.restApiContext, linkId, {
				workflowId,
			});
			if (current === turn) preflight.value = { status: 'ready', preflight: result };
		} catch (error) {
			if (current !== turn) return;
			preflight.value = {
				status: 'failed',
				message: requestErrorMessage(error, messages.checkFailed()),
			};
		}
	}

	/** @returns the result, or `undefined` when the move failed or the dialog closed meanwhile */
	async function move(
		request: LinkedInstanceTransferRequestDto,
	): Promise<LinkedInstancePushResult | undefined> {
		if (isMoving.value || preflight.value.status !== 'ready') return undefined;
		const current = turn;
		isMoving.value = true;
		moveError.value = undefined;
		try {
			const result = await moveWorkflow(rootStore.restApiContext, subject().linkId, request);
			return current === turn ? result : undefined;
		} catch (error) {
			if (current === turn) moveError.value = requestErrorMessage(error, messages.moveFailed());
			return undefined;
		} finally {
			if (current === turn) isMoving.value = false;
		}
	}

	watch(
		open,
		(isOpen) => {
			isMoving.value = false;
			if (isOpen) {
				void check();
				return;
			}
			turn += 1;
			moveError.value = undefined;
		},
		{ immediate: true },
	);

	return { preflight, isMoving, moveError, retry: check, move };
}
