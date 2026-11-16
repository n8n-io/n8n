import { ref, type ComputedRef, type Ref } from 'vue';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import type { KnowledgeUploadClientFailureReason } from './useAgentTelemetry';
import {
	deleteAgentFile,
	listAgentFiles,
	uploadAgentFiles,
	warmAgentKnowledgeSandbox,
} from './useKnowledgeApi';
import type { AgentResource } from '../types';

/**
 * Telemetry seam for the knowledge file actions.
 */
export interface AgentKnowledgeTelemetry {
	trackStartedFileUpload: (fileCount: number) => void;
	trackRejectedFileUpload: (reason: KnowledgeUploadClientFailureReason, fileCount: number) => void;
}

export interface UseAgentKnowledgeDeps {
	projectId: Ref<string> | ComputedRef<string>;
	agentId: Ref<string> | ComputedRef<string>;
	/** The loaded agent. The sandbox warm-up needs a row to warm for. */
	agent: Ref<AgentResource | null>;
	/** Whether the host finished loading the agent. */
	initialized: Ref<boolean>;
	/** Whether the agent is still a local draft without a row. */
	isUnsaved: Ref<boolean>;
	/** Whether the backend offers the file knowledge base. */
	isKnowledgeBaseEnabled: ComputedRef<boolean>;
	/**
	 * The host's stale-target guard. A call captures its target at call time;
	 * the user may have switched agents before it resolves, and the result must
	 * not land on the new selection's state.
	 */
	isStaleAgentTarget: (targetProjectId: string, targetAgentId: string) => boolean;
	/** Creates the agent row when the agent is still a draft, so the upload has a target. */
	ensureAgentPersisted: () => Promise<void>;
	telemetry: AgentKnowledgeTelemetry;
}

/**
 * The knowledge files of the agent open in the builder: the list, the upload
 * with its client-side checks, the deletion and the sandbox warm-up. The host
 * owns the agent and project identity and hands over its guards.
 */
export function useAgentKnowledge(deps: UseAgentKnowledgeDeps) {
	const locale = useI18n();
	const rootStore = useRootStore();
	const { showError, showMessage } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();

	const agentFiles = ref<AgentFileDto[]>([]);
	const agentFilesLoading = ref(false);
	const agentFilesUploading = ref(false);
	const deletingAgentFileId = ref<string | null>(null);
	const lastKnowledgeSandboxWarmupKey = ref<string | null>(null);

	async function fetchAgentFiles(
		targetProjectId: string = deps.projectId.value,
		targetAgentId: string = deps.agentId.value,
	) {
		if (!deps.isKnowledgeBaseEnabled.value) return;
		agentFilesLoading.value = true;
		try {
			const files = await listAgentFiles(rootStore.restApiContext, targetProjectId, targetAgentId);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			agentFiles.value = files;
		} catch (error) {
			showError(error, locale.baseText('agents.builder.files.loadError'));
		} finally {
			if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) {
				agentFilesLoading.value = false;
			}
		}
	}

	async function uploadFiles(files: File[]) {
		if (files.length === 0) return;
		deps.telemetry.trackStartedFileUpload(files.length);

		const oversizedFiles = files.filter((file) => file.size > MAX_AGENT_FILE_SIZE_BYTES);
		if (oversizedFiles.length > 0) {
			showError(
				new Error(
					locale.baseText('agents.builder.files.uploadFileTooLarge.message', {
						interpolate: { name: oversizedFiles[0].name, size: String(MAX_AGENT_FILE_SIZE_MB) },
					}),
				),
				locale.baseText('agents.builder.files.uploadFileTooLarge.title'),
			);
		}
		// Make sure each upload reports one client rejection at most: report the oversized files
		// only when no later check rejects the upload.
		const filesWithinLimit = files.filter((file) => file.size <= MAX_AGENT_FILE_SIZE_BYTES);
		if (filesWithinLimit.length === 0) {
			deps.telemetry.trackRejectedFileUpload('file_size', oversizedFiles.length);
			return;
		}

		if (filesWithinLimit.length > MAX_AGENT_FILES_PER_UPLOAD) {
			deps.telemetry.trackRejectedFileUpload('too_many_files', filesWithinLimit.length);
			showError(
				new Error(
					locale.baseText('agents.builder.files.uploadTooManyFiles.message' as BaseTextKey, {
						interpolate: { max: String(MAX_AGENT_FILES_PER_UPLOAD) },
					}),
				),
				locale.baseText('agents.builder.files.uploadTooManyFiles.title' as BaseTextKey),
			);
			return;
		}

		const existingTotalSizeBytes = agentFiles.value.reduce(
			(total, file) => total + file.fileSizeBytes,
			0,
		);
		const uploadTotalSizeBytes = filesWithinLimit.reduce((total, file) => total + file.size, 0);
		if (existingTotalSizeBytes + uploadTotalSizeBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
			deps.telemetry.trackRejectedFileUpload('total_limit', filesWithinLimit.length);
			showError(
				new Error(
					locale.baseText('agents.builder.files.uploadTotalTooLarge.message' as BaseTextKey, {
						interpolate: { size: String(MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB) },
					}),
				),
				locale.baseText('agents.builder.files.uploadTotalTooLarge.title' as BaseTextKey),
			);
			return;
		}

		if (oversizedFiles.length > 0) {
			deps.telemetry.trackRejectedFileUpload('file_size', oversizedFiles.length);
		}

		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		agentFilesUploading.value = true;
		try {
			await deps.ensureAgentPersisted();
			const uploadedFiles = await uploadAgentFiles(
				rootStore.restApiContext,
				targetProjectId,
				targetAgentId,
				filesWithinLimit,
			);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			const existingById = new Map(agentFiles.value.map((file) => [file.id, file]));
			for (const file of uploadedFiles) {
				existingById.set(file.id, file);
			}
			agentFiles.value = Array.from(existingById.values()).sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
			showMessage({
				title: locale.baseText('agents.builder.files.uploaded'),
				type: 'success',
			});
		} catch (error) {
			showError(error, locale.baseText('agents.builder.files.uploadError'));
		} finally {
			if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) {
				agentFilesUploading.value = false;
			}
		}
	}

	async function deleteFile(file: AgentFileDto) {
		if (deletingAgentFileId.value !== null) return;

		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.builder.files.deleteModal.title', {
				interpolate: { name: file.fileName },
			}),
			description: locale.baseText('agents.builder.files.deleteModal.description', {
				interpolate: { name: file.fileName },
			}),
			confirmButtonText: locale.baseText('agents.builder.files.deleteModal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;

		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		deletingAgentFileId.value = file.id;
		try {
			await deleteAgentFile(rootStore.restApiContext, targetProjectId, targetAgentId, file.id);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			agentFiles.value = agentFiles.value.filter((agentFile) => agentFile.id !== file.id);
			showMessage({
				title: locale.baseText('agents.builder.files.deleted'),
				type: 'success',
			});
		} catch (error) {
			showError(error, locale.baseText('agents.builder.files.deleteError'));
		} finally {
			if (deletingAgentFileId.value === file.id) {
				deletingAgentFileId.value = null;
			}
		}
	}

	function warmKnowledgeSandbox() {
		if (!deps.initialized.value || !deps.isKnowledgeBaseEnabled.value || !deps.agent.value) return;
		// No agent row to warm a sandbox for yet.
		if (deps.isUnsaved.value) return;

		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		const warmupKey = `${targetProjectId}:${targetAgentId}`;
		if (lastKnowledgeSandboxWarmupKey.value === warmupKey) return;
		lastKnowledgeSandboxWarmupKey.value = warmupKey;

		void warmAgentKnowledgeSandbox(rootStore.restApiContext, targetProjectId, targetAgentId).catch(
			() => {
				if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) {
					lastKnowledgeSandboxWarmupKey.value = null;
				}
			},
		);
	}

	/** Clears the files state when the host switches to another agent. */
	function reset() {
		agentFiles.value = [];
		agentFilesLoading.value = false;
		agentFilesUploading.value = false;
		deletingAgentFileId.value = null;
	}

	return {
		agentFiles,
		agentFilesLoading,
		agentFilesUploading,
		deletingAgentFileId,
		fetchAgentFiles,
		uploadFiles,
		deleteFile,
		warmKnowledgeSandbox,
		reset,
	};
}
