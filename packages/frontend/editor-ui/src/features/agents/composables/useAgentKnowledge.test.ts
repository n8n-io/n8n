import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { computed, ref } from 'vue';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
	type FrontendModuleSettings,
} from '@n8n/api-types';

import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { useAgentKnowledge, type UseAgentKnowledgeDeps } from './useAgentKnowledge';
import type { AgentResource } from '../types';

const { baseTextSpy } = vi.hoisted(() => ({
	baseTextSpy: vi.fn((key: string) => key),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: baseTextSpy }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

const { settingsStoreState } = vi.hoisted(() => ({
	settingsStoreState: { moduleSettings: {} as FrontendModuleSettings },
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settingsStoreState,
}));

const { showErrorSpy, showMessageSpy } = vi.hoisted(() => ({
	showErrorSpy: vi.fn(),
	showMessageSpy: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy, showMessage: showMessageSpy }),
}));

const { openAgentConfirmationModalSpy } = vi.hoisted(() => ({
	openAgentConfirmationModalSpy: vi.fn(),
}));
vi.mock('./useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: openAgentConfirmationModalSpy,
	}),
}));

const { listAgentFilesMock, uploadAgentFilesMock, deleteAgentFileMock, warmSandboxMock } =
	vi.hoisted(() => ({
		listAgentFilesMock: vi.fn(),
		uploadAgentFilesMock: vi.fn(),
		deleteAgentFileMock: vi.fn(),
		warmSandboxMock: vi.fn(),
	}));
vi.mock('./useKnowledgeApi', () => ({
	listAgentFiles: listAgentFilesMock,
	uploadAgentFiles: uploadAgentFilesMock,
	deleteAgentFile: deleteAgentFileMock,
	warmAgentKnowledgeSandbox: warmSandboxMock,
}));

function makeFile(name: string, size?: number) {
	const file = new File(['x'], name, { type: 'text/plain' });
	if (size !== undefined) {
		Object.defineProperty(file, 'size', { value: size });
	}
	return file;
}

function makeAgentFile(overrides: Partial<AgentFileDto> = {}): AgentFileDto {
	return {
		id: 'file-1',
		agentId: 'a1',
		fileName: 'existing.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 4,
		createdAt: '2026-06-01T10:00:00.000Z',
		...overrides,
	};
}

function setup(overrides: Partial<UseAgentKnowledgeDeps> = {}) {
	const telemetry = {
		trackStartedFileUpload: vi.fn(),
		trackRejectedFileUpload: vi.fn(),
	};
	const projectId = ref('p1');
	const agentId = ref('a1');
	// The host's guard: a call made for another agent or project is stale. A test
	// "navigates" by changing the ids while a request is in flight.
	const isStaleAgentTarget = vi.fn(
		(targetProjectId: string, targetAgentId: string) =>
			projectId.value !== targetProjectId || agentId.value !== targetAgentId,
	);
	const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
	const deps: UseAgentKnowledgeDeps = {
		projectId,
		agentId,
		agent: ref<AgentResource | null>({ id: 'a1' } as AgentResource),
		initialized: ref(true),
		isUnsaved: ref(false),
		isKnowledgeBaseEnabled: computed(() => true),
		isStaleAgentTarget,
		ensureAgentPersisted,
		telemetry,
		...overrides,
	};
	return { knowledge: useAgentKnowledge(deps), deps, agentId, telemetry };
}

describe('useAgentKnowledge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStoreState.moduleSettings = {};
		listAgentFilesMock.mockResolvedValue([]);
		uploadAgentFilesMock.mockResolvedValue([]);
		deleteAgentFileMock.mockResolvedValue(undefined);
		warmSandboxMock.mockResolvedValue({ accepted: true });
		openAgentConfirmationModalSpy.mockResolvedValue(MODAL_CONFIRM);
	});

	describe('fetchAgentFiles', () => {
		it('loads the files of the agent', async () => {
			const files = [makeAgentFile()];
			listAgentFilesMock.mockResolvedValue(files);
			const { knowledge } = setup();

			await knowledge.fetchAgentFiles();

			expect(listAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1');
			expect(knowledge.agentFiles.value).toEqual(files);
			expect(knowledge.agentFilesLoading.value).toBe(false);
		});

		it('does nothing while the knowledge base is disabled', async () => {
			const { knowledge } = setup({ isKnowledgeBaseEnabled: computed(() => false) });

			await knowledge.fetchAgentFiles();

			expect(listAgentFilesMock).not.toHaveBeenCalled();
		});

		it('drops a result that arrives after the user switched agents', async () => {
			const pending = createDeferredPromise<AgentFileDto[]>();
			listAgentFilesMock.mockReturnValue(pending.promise);
			const { knowledge, agentId } = setup();

			const fetching = knowledge.fetchAgentFiles();
			agentId.value = 'a2';
			pending.resolve([makeAgentFile()]);
			await fetching;

			expect(knowledge.agentFiles.value).toEqual([]);
			// The loading state belongs to the agent the user left; the new agent's own fetch owns it now.
			expect(knowledge.agentFilesLoading.value).toBe(true);
		});

		it('reports a failed load', async () => {
			listAgentFilesMock.mockRejectedValue(new Error('boom'));
			const { knowledge } = setup();

			await knowledge.fetchAgentFiles();

			expect(showErrorSpy).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.files.loadError',
			);
			expect(knowledge.agentFilesLoading.value).toBe(false);
		});
	});

	describe('uploadFiles', () => {
		it('ignores an empty selection', async () => {
			const { knowledge, telemetry } = setup();

			await knowledge.uploadFiles([]);

			expect(telemetry.trackStartedFileUpload).not.toHaveBeenCalled();
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('persists the agent, uploads the files and lists the newest first', async () => {
			const older = makeAgentFile({ id: 'older', createdAt: '2026-06-01T10:00:00.000Z' });
			const newer = makeAgentFile({ id: 'newer', createdAt: '2026-06-02T10:00:00.000Z' });
			uploadAgentFilesMock.mockResolvedValue([newer]);
			const { knowledge, deps, telemetry } = setup();
			knowledge.agentFiles.value = [older];
			const files = [makeFile('a.txt'), makeFile('b.txt')];

			await knowledge.uploadFiles(files);

			expect(telemetry.trackStartedFileUpload).toHaveBeenCalledWith(2);
			expect(telemetry.trackRejectedFileUpload).not.toHaveBeenCalled();
			expect(deps.ensureAgentPersisted).toHaveBeenCalledTimes(1);
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', files);
			expect(knowledge.agentFiles.value.map((file) => file.id)).toEqual(['newer', 'older']);
			expect(knowledge.agentFilesUploading.value).toBe(false);
			expect(showMessageSpy).toHaveBeenCalledWith({
				title: 'agents.builder.files.uploaded',
				type: 'success',
			});
		});

		it('rejects an oversized file with the limit in the message and uploads the rest', async () => {
			const { knowledge, telemetry } = setup();
			const small = makeFile('small.txt');

			await knowledge.uploadFiles([makeFile('big.txt', MAX_AGENT_FILE_SIZE_BYTES + 1), small]);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadFileTooLarge.message', {
				interpolate: { name: 'big.txt', size: String(MAX_AGENT_FILE_SIZE_MB) },
			});
			expect(showErrorSpy).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.files.uploadFileTooLarge.title',
			);
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('file_size', 1);
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', [small]);
		});

		it('accepts a file exactly at the size limit', async () => {
			const { knowledge, telemetry } = setup();
			const file = makeFile('exact.txt', MAX_AGENT_FILE_SIZE_BYTES);

			await knowledge.uploadFiles([file]);

			expect(telemetry.trackRejectedFileUpload).not.toHaveBeenCalled();
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', [file]);
		});

		it('uploads nothing when every file is oversized', async () => {
			const { knowledge, telemetry } = setup();

			await knowledge.uploadFiles([
				makeFile('big-1.txt', MAX_AGENT_FILE_SIZE_BYTES + 1),
				makeFile('big-2.txt', MAX_AGENT_FILE_SIZE_BYTES + 1),
			]);

			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledTimes(1);
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('file_size', 2);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('rejects too many files with the limit in the message', async () => {
			const { knowledge, telemetry } = setup();
			const files = Array.from({ length: MAX_AGENT_FILES_PER_UPLOAD + 1 }, (_, index) =>
				makeFile(`file-${index}.txt`),
			);

			await knowledge.uploadFiles(files);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadTooManyFiles.message', {
				interpolate: { max: String(MAX_AGENT_FILES_PER_UPLOAD) },
			});
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith(
				'too_many_files',
				MAX_AGENT_FILES_PER_UPLOAD + 1,
			);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('reports only the later rejection when oversized files come with too many files', async () => {
			const { knowledge, telemetry } = setup();
			const files = Array.from({ length: MAX_AGENT_FILES_PER_UPLOAD + 1 }, (_, index) =>
				makeFile(`file-${index}.txt`),
			);

			await knowledge.uploadFiles([makeFile('big.txt', MAX_AGENT_FILE_SIZE_BYTES + 1), ...files]);

			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledTimes(1);
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith(
				'too_many_files',
				MAX_AGENT_FILES_PER_UPLOAD + 1,
			);
		});

		it('rejects an upload that would exceed the total size with the limit in the message', async () => {
			const { knowledge, telemetry } = setup();
			knowledge.agentFiles.value = [
				makeAgentFile({ fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES }),
			];

			await knowledge.uploadFiles([makeFile('notes.txt')]);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadTotalTooLarge.message', {
				interpolate: { size: String(MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB) },
			});
			expect(showErrorSpy).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.files.uploadTotalTooLarge.title',
			);
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('total_limit', 1);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('reports a failed upload and clears the uploading state', async () => {
			uploadAgentFilesMock.mockRejectedValue(new Error('boom'));
			const { knowledge } = setup();

			await knowledge.uploadFiles([makeFile('a.txt')]);

			expect(showErrorSpy).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.files.uploadError',
			);
			expect(knowledge.agentFilesUploading.value).toBe(false);
		});

		it('drops an upload result that arrives after the user switched agents', async () => {
			const pending = createDeferredPromise<AgentFileDto[]>();
			uploadAgentFilesMock.mockReturnValue(pending.promise);
			const { knowledge, agentId } = setup();

			const uploading = knowledge.uploadFiles([makeFile('a.txt')]);
			await flushPromises();
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', [
				expect.any(File),
			]);
			agentId.value = 'a2';
			pending.resolve([makeAgentFile()]);
			await uploading;

			expect(knowledge.agentFiles.value).toEqual([]);
			expect(showMessageSpy).not.toHaveBeenCalled();
			expect(knowledge.agentFilesUploading.value).toBe(true);
		});
	});

	describe('upload limits from the module settings', () => {
		const MB = 1024 * 1024;

		it('falls back to the default limits while the module settings carry none', () => {
			const { knowledge } = setup();

			expect(knowledge.uploadLimits.value).toEqual({
				maxFileSizeBytes: MAX_AGENT_FILE_SIZE_BYTES,
				maxFilesPerUpload: MAX_AGENT_FILES_PER_UPLOAD,
				maxTotalSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
			});
		});

		it('rejects a file above a lower configured size limit before the request, with the limit in the message', async () => {
			settingsStoreState.moduleSettings = {
				knowledge: {
					limits: { maxFileSizeBytes: 5 * MB, maxFilesPerUpload: 10, maxTotalSizeBytes: 1536 * MB },
				},
			};
			const { knowledge, telemetry } = setup();

			await knowledge.uploadFiles([makeFile('big.txt', 5 * MB + 1)]);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadFileTooLarge.message', {
				interpolate: { name: 'big.txt', size: '5' },
			});
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('file_size', 1);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('accepts a file above the default size limit when the configured limit is higher', async () => {
			settingsStoreState.moduleSettings = {
				knowledge: {
					limits: {
						maxFileSizeBytes: 50 * MB,
						maxFilesPerUpload: 10,
						maxTotalSizeBytes: 1536 * MB,
					},
				},
			};
			const { knowledge, telemetry } = setup();
			const file = makeFile('big.txt', MAX_AGENT_FILE_SIZE_BYTES + 1);

			await knowledge.uploadFiles([file]);

			expect(telemetry.trackRejectedFileUpload).not.toHaveBeenCalled();
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', [file]);
		});

		it('rejects more files than a lower configured count limit, with the limit in the message', async () => {
			settingsStoreState.moduleSettings = {
				knowledge: {
					limits: { maxFileSizeBytes: 25 * MB, maxFilesPerUpload: 3, maxTotalSizeBytes: 1536 * MB },
				},
			};
			const { knowledge, telemetry } = setup();

			await knowledge.uploadFiles([
				makeFile('1.txt'),
				makeFile('2.txt'),
				makeFile('3.txt'),
				makeFile('4.txt'),
			]);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadTooManyFiles.message', {
				interpolate: { max: '3' },
			});
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('too_many_files', 4);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('rejects a total above a lower configured total limit, with the limit in gigabytes', async () => {
			settingsStoreState.moduleSettings = {
				knowledge: {
					limits: { maxFileSizeBytes: 25 * MB, maxFilesPerUpload: 10, maxTotalSizeBytes: 500 * MB },
				},
			};
			const { knowledge, telemetry } = setup();
			knowledge.agentFiles.value = [makeAgentFile({ fileSizeBytes: 500 * MB })];

			await knowledge.uploadFiles([makeFile('notes.txt')]);

			expect(baseTextSpy).toHaveBeenCalledWith('agents.builder.files.uploadTotalTooLarge.message', {
				interpolate: { size: '0.49' },
			});
			expect(telemetry.trackRejectedFileUpload).toHaveBeenCalledWith('total_limit', 1);
			expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		});

		it('accepts a total above the default limit when the configured total limit is higher', async () => {
			settingsStoreState.moduleSettings = {
				knowledge: {
					limits: {
						maxFileSizeBytes: 25 * MB,
						maxFilesPerUpload: 10,
						maxTotalSizeBytes: 2000 * MB,
					},
				},
			};
			const { knowledge, telemetry } = setup();
			knowledge.agentFiles.value = [
				makeAgentFile({ fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES }),
			];
			const file = makeFile('notes.txt');

			await knowledge.uploadFiles([file]);

			expect(telemetry.trackRejectedFileUpload).not.toHaveBeenCalled();
			expect(uploadAgentFilesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', [file]);
		});
	});

	describe('deleteFile', () => {
		it('deletes the file after the user confirms', async () => {
			const { knowledge } = setup();
			const file = makeAgentFile();
			knowledge.agentFiles.value = [file, makeAgentFile({ id: 'file-2' })];

			await knowledge.deleteFile(file);

			expect(openAgentConfirmationModalSpy).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'agents.builder.files.deleteModal.title' }),
			);
			expect(deleteAgentFileMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', 'file-1');
			expect(knowledge.agentFiles.value.map(({ id }) => id)).toEqual(['file-2']);
			expect(knowledge.deletingAgentFileId.value).toBeNull();
			expect(showMessageSpy).toHaveBeenCalledWith({
				title: 'agents.builder.files.deleted',
				type: 'success',
			});
		});

		it('keeps the file when the user cancels', async () => {
			openAgentConfirmationModalSpy.mockResolvedValue(MODAL_CANCEL);
			const { knowledge } = setup();
			const file = makeAgentFile();
			knowledge.agentFiles.value = [file];

			await knowledge.deleteFile(file);

			expect(deleteAgentFileMock).not.toHaveBeenCalled();
			expect(knowledge.agentFiles.value).toEqual([file]);
		});

		it('ignores a second delete while one is running', async () => {
			const { knowledge } = setup();
			knowledge.deletingAgentFileId.value = 'other';

			await knowledge.deleteFile(makeAgentFile());

			expect(openAgentConfirmationModalSpy).not.toHaveBeenCalled();
		});

		it('reports a failed delete and clears the deleting state', async () => {
			deleteAgentFileMock.mockRejectedValue(new Error('boom'));
			const { knowledge } = setup();
			const file = makeAgentFile();
			knowledge.agentFiles.value = [file];

			await knowledge.deleteFile(file);

			expect(showErrorSpy).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.files.deleteError',
			);
			expect(knowledge.agentFiles.value).toEqual([file]);
			expect(knowledge.deletingAgentFileId.value).toBeNull();
		});
	});

	describe('warmKnowledgeSandbox', () => {
		it('warms the sandbox once per agent', () => {
			const { knowledge, agentId } = setup();

			knowledge.warmKnowledgeSandbox();
			knowledge.warmKnowledgeSandbox();
			expect(warmSandboxMock).toHaveBeenCalledTimes(1);
			expect(warmSandboxMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1');

			agentId.value = 'a2';
			knowledge.warmKnowledgeSandbox();
			knowledge.warmKnowledgeSandbox();

			expect(warmSandboxMock).toHaveBeenCalledTimes(2);
			expect(warmSandboxMock).toHaveBeenLastCalledWith(expect.anything(), 'p1', 'a2');
		});

		it.each([
			['the page is not initialized', { initialized: ref(false) }],
			['the knowledge base is disabled', { isKnowledgeBaseEnabled: computed(() => false) }],
			['no agent is loaded', { agent: ref<AgentResource | null>(null) }],
			['the agent has no row yet', { isUnsaved: ref(true) }],
		] as const)('does nothing when %s', (_, overrides) => {
			const { knowledge } = setup(overrides);

			knowledge.warmKnowledgeSandbox();

			expect(warmSandboxMock).not.toHaveBeenCalled();
		});

		it('warms again after a failed attempt', async () => {
			warmSandboxMock.mockRejectedValueOnce(new Error('boom'));
			const { knowledge } = setup();

			knowledge.warmKnowledgeSandbox();
			await flushPromises();
			knowledge.warmKnowledgeSandbox();

			expect(warmSandboxMock).toHaveBeenCalledTimes(2);
		});

		it('keeps the key when the failure arrives after the user switched agents', async () => {
			const pending = createDeferredPromise<{ accepted: true }>();
			warmSandboxMock.mockReturnValueOnce(pending.promise);
			const { knowledge, agentId } = setup();

			knowledge.warmKnowledgeSandbox();
			agentId.value = 'a2';
			pending.reject(new Error('boom'));
			await flushPromises();
			agentId.value = 'a1';
			knowledge.warmKnowledgeSandbox();

			expect(warmSandboxMock).toHaveBeenCalledTimes(1);
		});
	});

	it('reset clears the files state', () => {
		const { knowledge } = setup();
		knowledge.agentFiles.value = [makeAgentFile()];
		knowledge.agentFilesLoading.value = true;
		knowledge.agentFilesUploading.value = true;
		knowledge.deletingAgentFileId.value = 'file-1';

		knowledge.reset();

		expect(knowledge.agentFiles.value).toEqual([]);
		expect(knowledge.agentFilesLoading.value).toBe(false);
		expect(knowledge.agentFilesUploading.value).toBe(false);
		expect(knowledge.deletingAgentFileId.value).toBeNull();
	});
});
