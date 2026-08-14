import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';

import { useAgentSessionLangSmithExport } from '../composables/useAgentSessionLangSmithExport';

const {
	settingsStore,
	exportThreadToLangSmith,
	openAgentConfirmationModal,
	copy,
	showError,
	showMessage,
} = vi.hoisted(() => ({
	settingsStore: {
		moduleSettings: { agents: { langsmithDebugExportEnabled: false } },
	},
	exportThreadToLangSmith: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
	copy: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settingsStore,
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ exportThreadToLangSmith }),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const session = {
	projectId: 'project-1',
	agentId: 'agent-1',
	threadId: 'thread-1',
};

describe('useAgentSessionLangSmithExport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		settingsStore.moduleSettings.agents.langsmithDebugExportEnabled = false;
	});

	it('is enabled only when both debug gates are enabled', () => {
		localStorage.setItem('instanceAi.debugMode', 'true');
		expect(useAgentSessionLangSmithExport().isEnabled.value).toBe(false);

		localStorage.removeItem('instanceAi.debugMode');
		settingsStore.moduleSettings.agents.langsmithDebugExportEnabled = true;
		expect(useAgentSessionLangSmithExport().isEnabled.value).toBe(false);

		localStorage.setItem('instanceAi.debugMode', 'true');
		expect(useAgentSessionLangSmithExport().isEnabled.value).toBe(true);
	});

	it('does not export when confirmation is canceled', async () => {
		localStorage.setItem('instanceAi.debugMode', 'true');
		settingsStore.moduleSettings.agents.langsmithDebugExportEnabled = true;
		openAgentConfirmationModal.mockResolvedValueOnce(MODAL_CANCEL);
		const { isExporting, sendSession } = useAgentSessionLangSmithExport();

		await sendSession(session);

		expect(exportThreadToLangSmith).not.toHaveBeenCalled();
		expect(isExporting.value).toBe(false);
	});

	it('exports once and copies the trace ID while the request is in flight', async () => {
		localStorage.setItem('instanceAi.debugMode', 'true');
		settingsStore.moduleSettings.agents.langsmithDebugExportEnabled = true;
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		const { promise, resolve } = Promise.withResolvers<{ traceId: string }>();
		exportThreadToLangSmith.mockReturnValueOnce(promise);
		const { isExporting, sendSession } = useAgentSessionLangSmithExport();

		const exporting = sendSession(session);
		await Promise.resolve();
		await sendSession(session);

		expect(isExporting.value).toBe(true);
		expect(exportThreadToLangSmith).toHaveBeenCalledOnce();

		resolve({ traceId: 'trace-1' });
		await exporting;

		expect(exportThreadToLangSmith).toHaveBeenCalledWith('project-1', 'agent-1', 'thread-1');
		expect(copy).toHaveBeenCalledWith('trace-1');
		expect(showMessage).toHaveBeenCalledOnce();
		expect(isExporting.value).toBe(false);
	});

	it('allows retrying after a failed export', async () => {
		localStorage.setItem('instanceAi.debugMode', 'true');
		settingsStore.moduleSettings.agents.langsmithDebugExportEnabled = true;
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
		const error = new Error('Request failed');
		exportThreadToLangSmith
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce({ traceId: 'trace-2' });
		const { isExporting, sendSession } = useAgentSessionLangSmithExport();

		await sendSession(session);

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(isExporting.value).toBe(false);

		await sendSession(session);

		expect(exportThreadToLangSmith).toHaveBeenCalledTimes(2);
		expect(copy).toHaveBeenCalledWith('trace-2');
	});
});
