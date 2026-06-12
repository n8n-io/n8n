// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	__resetPermissionPromptsForTests,
	addPrompt,
	chatAnswerablePromptForThread,
	clearAllPrompts,
	connectLocalPromptSource,
	externalPromptsForThread,
	hasBlockingPromptForThread,
	hasUnanswerablePromptForThread,
	permissionPromptState,
	removeInstancePromptsByRun,
	removeInstancePromptsByThread,
	removeInstancePromptsByToolCall,
	removePrompt,
	respondToPrompt,
} from './permission-prompt-store';
import type { InstancePermissionPrompt, LocalPermissionPrompt } from './prompt-classification';
import type { ConfirmThreadResult, LocalPermissionPromptRequest } from '../../shared/types';

function makeInstancePrompt(
	overrides: Partial<InstancePermissionPrompt> = {},
): InstancePermissionPrompt {
	return {
		id: `instance:${overrides.requestId ?? 'req-1'}`,
		source: 'instance',
		kind: 'approval',
		threadId: 't1',
		requestId: 'req-1',
		toolCallId: 'tool-1',
		runId: 'run-1',
		severity: 'warning',
		message: 'Allow?',
		...overrides,
	};
}

function makeLocalPrompt(overrides: Partial<LocalPermissionPrompt> = {}): LocalPermissionPrompt {
	return {
		id: 'local:p1',
		source: 'local',
		kind: 'resourceDecision',
		localId: 'p1',
		severity: 'warning',
		message: 'Write file',
		resourceDecision: {
			resource: '/tmp/ok.txt',
			description: 'Write file',
			options: ['denyOnce', 'allowOnce', 'allowForSession'],
		},
		...overrides,
	};
}

type LocalRequestCb = (request: LocalPermissionPromptRequest) => void;
type WithdrawnCb = (id: string) => void;

function stubElectronApi(
	overrides: {
		confirmThreadRequest?: ReturnType<typeof vi.fn>;
		listPermissionPrompts?: ReturnType<typeof vi.fn>;
	} = {},
) {
	let onRequested: LocalRequestCb | undefined;
	let onWithdrawn: WithdrawnCb | undefined;
	const api = {
		respondToPermissionPrompt: vi.fn(async () => await Promise.resolve({ ok: true })),
		openThread: vi.fn(async () => await Promise.resolve()),
		confirmThreadRequest:
			overrides.confirmThreadRequest ??
			vi.fn(async (): Promise<ConfirmThreadResult> => await Promise.resolve({ ok: true })),
		listPermissionPrompts:
			overrides.listPermissionPrompts ?? vi.fn(async () => await Promise.resolve([])),
		onPermissionPromptRequested: vi.fn((onRequestCallback: LocalRequestCb) => {
			onRequested = onRequestCallback;
			return () => {};
		}),
		onPermissionPromptWithdrawn: vi.fn((onWithdrawCallback: WithdrawnCb) => {
			onWithdrawn = onWithdrawCallback;
			return () => {};
		}),
	};
	(globalThis as unknown as { window: { electronAPI: typeof api } }).window = { electronAPI: api };
	return {
		api,
		pushRequested: (request: LocalPermissionPromptRequest) => onRequested?.(request),
		pushWithdrawn: (id: string) => onWithdrawn?.(id),
	};
}

const LOCAL_REQUEST: LocalPermissionPromptRequest = {
	id: 'p1',
	resource: { toolGroup: 'filesystemWrite', resource: '/tmp/ok.txt', description: 'Write file' },
	options: ['denyOnce', 'allowOnce', 'allowForSession'],
};

describe('permission-prompt-store', () => {
	beforeEach(() => {
		__resetPermissionPromptsForTests();
	});

	describe('addPrompt / removal helpers', () => {
		it('keeps prompts oldest-first and dedupes by id', () => {
			addPrompt(makeInstancePrompt());
			addPrompt(makeInstancePrompt({ requestId: 'req-2', message: 'second' }));
			addPrompt(makeInstancePrompt({ message: 'duplicate of first' }));

			expect(permissionPromptState.prompts.map((prompt) => prompt.id)).toEqual([
				'instance:req-1',
				'instance:req-2',
			]);
			expect(permissionPromptState.prompts[0].message).toBe('Allow?');
		});

		it('removes by tool call only within the thread', () => {
			addPrompt(makeInstancePrompt());
			addPrompt(makeInstancePrompt({ requestId: 'req-2', threadId: 't2' }));

			removeInstancePromptsByToolCall('t1', 'tool-1');

			expect(permissionPromptState.prompts.map((prompt) => prompt.id)).toEqual(['instance:req-2']);
		});

		it('removes by run, including prompts without a runId, sparing other runs', () => {
			addPrompt(makeInstancePrompt());
			addPrompt(makeInstancePrompt({ requestId: 'req-2', runId: undefined }));
			addPrompt(makeInstancePrompt({ requestId: 'req-3', runId: 'run-9' }));

			removeInstancePromptsByRun('t1', 'run-1');

			expect(permissionPromptState.prompts.map((prompt) => prompt.id)).toEqual(['instance:req-3']);
		});

		it('removes a whole thread but leaves local prompts alone', () => {
			addPrompt(makeInstancePrompt());
			addPrompt(makeLocalPrompt());

			removeInstancePromptsByThread('t1');

			expect(permissionPromptState.prompts.map((prompt) => prompt.id)).toEqual(['local:p1']);

			clearAllPrompts();
			expect(permissionPromptState.prompts).toHaveLength(0);
		});
	});

	describe('hasBlockingPromptForThread', () => {
		it('blocks on any instance prompt of the thread, including external ones', () => {
			addPrompt(makeInstancePrompt({ kind: 'external' }));
			addPrompt(makeLocalPrompt());

			expect(hasBlockingPromptForThread('t1')).toBe(true);
			expect(hasBlockingPromptForThread('t2')).toBe(false);

			removePrompt('instance:req-1');
			// A local prompt never blocks the chat — it suspends nothing.
			expect(hasBlockingPromptForThread('t1')).toBe(false);
		});
	});

	describe('chat-answerable helpers', () => {
		it('exposes the oldest answerable prompt and unlocks the composer for it', () => {
			addPrompt(
				makeInstancePrompt({
					kind: 'external',
					inputType: 'questions',
					questions: [{ id: 'q1', question: 'Which file?', type: 'text' }],
				}),
			);

			expect(chatAnswerablePromptForThread('t1')?.id).toBe('instance:req-1');
			expect(hasUnanswerablePromptForThread('t1')).toBe(false);
		});

		it('keeps the composer locked for external prompts the chat cannot answer', () => {
			addPrompt(makeInstancePrompt({ kind: 'external', inputType: 'plan-review' }));

			expect(chatAnswerablePromptForThread('t1')).toBeUndefined();
			expect(hasUnanswerablePromptForThread('t1')).toBe(true);
		});

		it('lists only the thread’s external prompts for the transcript', () => {
			const external = makeInstancePrompt({ kind: 'external', inputType: 'text' });
			addPrompt(external);
			addPrompt(makeInstancePrompt({ requestId: 'req-2', id: 'instance:req-2' }));
			addPrompt(makeInstancePrompt({ requestId: 'req-3', id: 'instance:req-3', threadId: 't2' }));

			expect(externalPromptsForThread('t1').map((prompt) => prompt.id)).toEqual([external.id]);
		});
	});

	describe('respondToPrompt', () => {
		it('routes a local prompt decision over IPC and removes the prompt', async () => {
			const { api } = stubElectronApi();
			addPrompt(makeLocalPrompt());

			await respondToPrompt('local:p1', { kind: 'resourceDecision', decision: 'allowOnce' });

			expect(api.respondToPermissionPrompt).toHaveBeenCalledWith('p1', 'allowOnce');
			expect(permissionPromptState.prompts).toHaveLength(0);
		});

		it.each([
			[
				'approval',
				makeInstancePrompt(),
				{ kind: 'approval', approved: false } as const,
				{ kind: 'approval', approved: false },
			],
			[
				'continue',
				makeInstancePrompt({ kind: 'continue' }),
				{ kind: 'continue' } as const,
				{ kind: 'approval', approved: true },
			],
			[
				'resource decision',
				makeInstancePrompt({ kind: 'resourceDecision' }),
				{ kind: 'resourceDecision', decision: 'allowForSession' } as const,
				{ kind: 'resourceDecision', resourceDecision: 'allowForSession' },
			],
			[
				'domain access approve',
				makeInstancePrompt({ kind: 'domainAccess' }),
				{ kind: 'domainAccessApprove', action: 'allow_domain' } as const,
				{ kind: 'domainAccessApprove', domainAccessAction: 'allow_domain' },
			],
			[
				'domain access deny',
				makeInstancePrompt({ kind: 'domainAccess' }),
				{ kind: 'domainAccessDeny' } as const,
				{ kind: 'domainAccessDeny' },
			],
			[
				'text answer',
				makeInstancePrompt({ kind: 'external', inputType: 'text' }),
				{ kind: 'approval', approved: true, userInput: 'the backup one' } as const,
				{ kind: 'approval', approved: true, userInput: 'the backup one' },
			],
			[
				'questions answer',
				makeInstancePrompt({ kind: 'external', inputType: 'questions' }),
				{
					kind: 'questions',
					answers: [{ questionId: 'q1', selectedOptions: [], customText: 'jokes.txt' }],
				} as const,
				{
					kind: 'questions',
					answers: [{ questionId: 'q1', selectedOptions: [], customText: 'jokes.txt' }],
				},
			],
		])(
			'maps an instance %s response to the confirm body',
			async (_label, prompt, response, body) => {
				const { api } = stubElectronApi();
				addPrompt(prompt);

				await respondToPrompt(prompt.id, response);

				expect(api.confirmThreadRequest).toHaveBeenCalledWith('t1', 'req-1', body);
				expect(permissionPromptState.prompts).toHaveLength(0);
			},
		);

		it('hands an external prompt off to the web UI without confirming or removing it', async () => {
			const { api } = stubElectronApi();
			addPrompt(makeInstancePrompt({ kind: 'external' }));

			await respondToPrompt('instance:req-1', { kind: 'openInWebUi' });

			expect(api.openThread).toHaveBeenCalledWith('t1');
			expect(api.confirmThreadRequest).not.toHaveBeenCalled();
			// Left in place — it clears via the live tool-result/run-finish once resolved.
			expect(permissionPromptState.prompts).toHaveLength(1);
		});

		it('silently drops the prompt when the request is stale (400/404)', async () => {
			const confirmThreadRequest = vi.fn(
				async (): Promise<ConfirmThreadResult> =>
					await Promise.resolve({ ok: false, status: 400, error: 'expired' }),
			);
			stubElectronApi({ confirmThreadRequest });
			addPrompt(makeInstancePrompt());

			await respondToPrompt('instance:req-1', { kind: 'approval', approved: true });

			expect(permissionPromptState.prompts).toHaveLength(0);
			expect(permissionPromptState.failedIds.size).toBe(0);
		});

		it('keeps and flags the prompt on a retryable failure, then clears the flag on retry', async () => {
			const confirmThreadRequest = vi
				.fn<() => Promise<ConfirmThreadResult>>()
				.mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' })
				.mockResolvedValueOnce({ ok: true });
			stubElectronApi({ confirmThreadRequest });
			addPrompt(makeInstancePrompt());

			await respondToPrompt('instance:req-1', { kind: 'approval', approved: true });
			expect(permissionPromptState.prompts).toHaveLength(1);
			expect(permissionPromptState.failedIds.has('instance:req-1')).toBe(true);

			await respondToPrompt('instance:req-1', { kind: 'approval', approved: true });
			expect(permissionPromptState.prompts).toHaveLength(0);
			expect(permissionPromptState.failedIds.size).toBe(0);
		});

		it('flags the prompt when the IPC call itself rejects', async () => {
			const confirmThreadRequest = vi.fn(async () => {
				await Promise.resolve();
				throw new Error('ipc broke');
			});
			stubElectronApi({ confirmThreadRequest });
			addPrompt(makeInstancePrompt());

			await respondToPrompt('instance:req-1', { kind: 'approval', approved: true });

			expect(permissionPromptState.prompts).toHaveLength(1);
			expect(permissionPromptState.failedIds.has('instance:req-1')).toBe(true);
		});

		it('ignores a second response while one is in flight', async () => {
			let resolveConfirm!: (result: ConfirmThreadResult) => void;
			const confirmThreadRequest = vi.fn(
				async () =>
					await new Promise<ConfirmThreadResult>((resolve) => {
						resolveConfirm = resolve;
					}),
			);
			stubElectronApi({ confirmThreadRequest });
			addPrompt(makeInstancePrompt());

			const first = respondToPrompt('instance:req-1', { kind: 'approval', approved: true });
			const second = respondToPrompt('instance:req-1', { kind: 'approval', approved: false });
			resolveConfirm({ ok: true });
			await Promise.all([first, second]);

			expect(confirmThreadRequest).toHaveBeenCalledTimes(1);
		});

		it('ignores unknown prompt ids', async () => {
			const { api } = stubElectronApi();
			await respondToPrompt('instance:ghost', { kind: 'approval', approved: true });
			expect(api.confirmThreadRequest).not.toHaveBeenCalled();
		});
	});

	describe('connectLocalPromptSource', () => {
		it('resyncs pending prompts and mirrors push add/withdraw, subscribing only once', async () => {
			const listPermissionPrompts = vi.fn(async () => await Promise.resolve([LOCAL_REQUEST]));
			const { api, pushRequested, pushWithdrawn } = stubElectronApi({ listPermissionPrompts });

			connectLocalPromptSource();
			connectLocalPromptSource();
			// Flush the async list → addPrompt resync chain.
			await Promise.resolve();
			await Promise.resolve();

			expect(api.onPermissionPromptRequested).toHaveBeenCalledTimes(1);
			expect(permissionPromptState.prompts.map((prompt) => prompt.id)).toEqual(['local:p1']);

			pushRequested({ ...LOCAL_REQUEST, id: 'p2' });
			expect(permissionPromptState.prompts).toHaveLength(2);

			pushWithdrawn('p1');
			pushWithdrawn('p2');
			expect(permissionPromptState.prompts).toHaveLength(0);
		});
	});
});
