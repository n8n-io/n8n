import type { AppSettings, StatusSnapshot } from '../shared/types';

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

declare global {
	interface Window {
		electronAPI: {
			getSettings: () => Promise<AppSettings>;
			setSettings: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; error?: string }>;
			getDaemonStatus: () => Promise<StatusSnapshot>;
			startDaemon: () => Promise<{ ok: boolean }>;
			stopDaemon: () => Promise<{ ok: boolean }>;
			onStatusChanged: (onChangeCallback: (snapshot: StatusSnapshot) => void) => void;
		};
	}
}

const STATUS_TEXT: Record<string, string> = {
	connected: 'Connected',
	waiting: 'Waiting',
	starting: 'Starting',
	disconnected: 'Disconnected',
	stopped: 'Stopped',
};

function updateStatusBadge(snapshot: StatusSnapshot): void {
	const dot = document.getElementById('statusDot');
	const text = document.getElementById('statusText');
	if (!dot || !text) return;

	dot.className = `status-dot ${snapshot.status}`;
	const label =
		snapshot.status === 'connected' && snapshot.connectedUrl
			? `Connected to ${snapshot.connectedUrl}`
			: (STATUS_TEXT[snapshot.status] ?? snapshot.status);
	text.textContent = label;
}

function readForm(): Partial<AppSettings> {
	const port = parseInt((document.getElementById('port') as HTMLInputElement).value, 10);
	const filesystemDir = (document.getElementById('filesystemDir') as HTMLInputElement).value.trim();
	const filesystemEnabled = (document.getElementById('filesystemEnabled') as HTMLInputElement)
		.checked;
	const shellEnabled = (document.getElementById('shellEnabled') as HTMLInputElement).checked;
	const screenshotEnabled = (document.getElementById('screenshotEnabled') as HTMLInputElement)
		.checked;
	const mouseKeyboardEnabled = (document.getElementById('mouseKeyboardEnabled') as HTMLInputElement)
		.checked;
	const browserEnabled = (document.getElementById('browserEnabled') as HTMLInputElement).checked;
	const rawOrigins = (document.getElementById('allowedOrigins') as HTMLTextAreaElement).value;
	const allowedOrigins = rawOrigins
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	const logLevel = (document.getElementById('logLevel') as HTMLSelectElement).value as LogLevel;

	return {
		...(Number.isFinite(port) && port > 0 ? { port } : {}),
		filesystemDir,
		filesystemEnabled,
		shellEnabled,
		screenshotEnabled,
		mouseKeyboardEnabled,
		browserEnabled,
		allowedOrigins,
		logLevel,
	};
}

function populateForm(settings: AppSettings): void {
	(document.getElementById('port') as HTMLInputElement).value = String(settings.port);
	(document.getElementById('filesystemDir') as HTMLInputElement).value = settings.filesystemDir;
	(document.getElementById('filesystemEnabled') as HTMLInputElement).checked =
		settings.filesystemEnabled;
	(document.getElementById('shellEnabled') as HTMLInputElement).checked = settings.shellEnabled;
	(document.getElementById('screenshotEnabled') as HTMLInputElement).checked =
		settings.screenshotEnabled;
	(document.getElementById('mouseKeyboardEnabled') as HTMLInputElement).checked =
		settings.mouseKeyboardEnabled;
	(document.getElementById('browserEnabled') as HTMLInputElement).checked = settings.browserEnabled;
	(document.getElementById('allowedOrigins') as HTMLTextAreaElement).value =
		settings.allowedOrigins.join('\n');
	(document.getElementById('logLevel') as HTMLSelectElement).value = settings.logLevel;
}

function setRestartNotice(visible: boolean): void {
	const notice = document.getElementById('restartNotice') as HTMLElement;
	notice.style.display = visible ? 'flex' : 'none';
}

function setButtonsState(dirty: boolean): void {
	(document.getElementById('applyBtn') as HTMLButtonElement).disabled = !dirty;
	(document.getElementById('saveBtn') as HTMLButtonElement).disabled = !dirty;
}

async function saveSettings(initial: AppSettings): Promise<AppSettings | null> {
	const partial = readForm();
	const result = await window.electronAPI.setSettings(partial);
	if (result.ok) {
		return { ...initial, ...partial } as AppSettings;
	}
	alert(`Failed to save settings: ${result.error ?? 'Unknown error'}`);
	return null;
}

function isFormDirty(initial: AppSettings): boolean {
	const current = readForm();
	return (
		JSON.stringify(current) !==
		JSON.stringify({
			port: initial.port,
			filesystemDir: initial.filesystemDir,
			filesystemEnabled: initial.filesystemEnabled,
			shellEnabled: initial.shellEnabled,
			screenshotEnabled: initial.screenshotEnabled,
			mouseKeyboardEnabled: initial.mouseKeyboardEnabled,
			browserEnabled: initial.browserEnabled,
			allowedOrigins: initial.allowedOrigins,
			logLevel: initial.logLevel,
		})
	);
}

async function init(): Promise<void> {
	const [settings, status] = await Promise.all([
		window.electronAPI.getSettings(),
		window.electronAPI.getDaemonStatus(),
	]);

	populateForm(settings);
	updateStatusBadge(status);
	setButtonsState(false);

	let initialSettings = { ...settings };

	// Show restart notice and update buttons when form is dirty
	const form = document.getElementById('settingsForm') as HTMLFormElement;
	form.addEventListener('change', () => {
		const dirty = isFormDirty(initialSettings);
		setRestartNotice(dirty);
		setButtonsState(dirty);
	});
	form.addEventListener('input', () => {
		const dirty = isFormDirty(initialSettings);
		setRestartNotice(dirty);
		setButtonsState(dirty);
	});

	// Browse button — user can type the path directly (dialog not exposed via preload)
	document.getElementById('browseDirBtn')?.addEventListener('click', () => {
		// Intentionally left as a no-op: Electron's dialog API is main-process only.
		// A future improvement could add an IPC channel to open a native folder picker.
	});

	// Apply button — save without closing
	document.getElementById('applyBtn')?.addEventListener('click', () => {
		void saveSettings(initialSettings)
			.then((saved) => {
				if (saved) {
					initialSettings = saved;
					setRestartNotice(false);
					setButtonsState(false);
					const applyBtn = document.getElementById('applyBtn') as HTMLButtonElement;
					applyBtn.textContent = 'Saved';
					setTimeout(() => {
						applyBtn.textContent = 'Apply';
					}, 2000);
				}
			})
			.catch((e: unknown) => {
				alert(`Failed to save settings: ${String(e)}`);
			});
	});

	// Save & Close button
	document.getElementById('saveBtn')?.addEventListener('click', () => {
		void saveSettings(initialSettings)
			.then((saved) => {
				if (saved) {
					window.close();
				}
			})
			.catch((e: unknown) => {
				alert(`Failed to save settings: ${String(e)}`);
			});
	});

	// Cancel button
	document.getElementById('cancelBtn')?.addEventListener('click', () => {
		window.close();
	});

	// Live status updates
	window.electronAPI.onStatusChanged(updateStatusBadge);
}

void init().catch((e: unknown) => {
	console.error('Settings init failed:', e);
});
