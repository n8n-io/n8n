import type { RemoteInstanceErrorReason } from '../remote/remote-instance.errors';

/** `push` moves a workflow to the linked instance, `pull` brings one back. */
export type TransferDirection = 'push' | 'pull';

/** The audit reason of a failed move: the reason of a remote failure, a refusal, or a bug. */
export type TransferFailureReason = RemoteInstanceErrorReason | 'refused' | 'internal';
