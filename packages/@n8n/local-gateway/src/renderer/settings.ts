import type {
	AppSettings,
	ConnectPayload,
	DaemonStatus,
	LogLevel,
	StatusSnapshot,
} from '../shared/types';

declare global {
	interface Window {
		electronAPI: {
			getSettings: () => Promise<AppSettings>;
			setSettings: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; error?: string }>;
			getDaemonStatus: () => Promise<StatusSnapshot>;
			connectGateway: (payload: ConnectPayload) => Promise<{ ok: boolean; error?: string }>;
			disconnectGateway: () => Promise<{ ok: boolean }>;
			onStatusChanged: (onChangeCallback: (snapshot: StatusSnapshot) => void) => void;
			onFocusGatewayToken: (onFocusCallback: () => void) => void;
		};
	}
}

const STATUS_TEXT: Record<DaemonStatus, string> = {
	connected: 'Connected',
	connecting: 'Connecting',
	disconnected: 'Disconnected',
	idle: 'Idle',
	error: 'Error',
};

function updateStatusBadge(snapshot: StatusSnapshot): void {
	const dot = document.getElementById('statusDot');
	const text = document.getElementById('statusText');
	if (!dot || !text) return;

	dot.className = `status-dot ${snapshot.status}`;
	let label: string;
	if (snapshot.status === 'connected' && snapshot.connectedUrl) {
		label = `Connected to ${snapshot.connectedUrl}`;
	} else if (snapshot.status === 'error') {
		if (snapshot.lastError) {
			const msg =
				snapshot.lastError.length > 120
					? `${snapshot.lastError.slice(0, 117)}...`
					: snapshot.lastError;
			label = `${STATUS_TEXT.error} · ${msg}`;
		} else {
			label = `${STATUS_TEXT.error} · see logs`;
		}
	} else {
		label = STATUS_TEXT[snapshot.status];
	}
	text.textContent = label;
	const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement | null;
	const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement | null;
	const tokenRow = document.getElementById('gatewayTokenRow');
	if (connectBtn && disconnectBtn) {
		const isConnected = snapshot.status === 'connected' || snapshot.status === 'connecting';
		connectBtn.disabled = isConnected;
		disconnectBtn.disabled = !isConnected;
		if (tokenRow) {
			tokenRow.style.display = isConnected ? 'none' : 'block';
		}
	}
}

function readForm(): Partial<AppSettings> {
	const instanceUrl = (document.getElementById('instanceUrl') as HTMLInputElement).value.trim();
	const filesystemDir = (document.getElementById('filesystemDir') as HTMLInputElement).value.trim();
	const filesystemEnabled = (document.getElementById('filesystemEnabled') as HTMLInputElement)
		.checked;
	const shellEnabled = (document.getElementById('shellEnabled') as HTMLInputElement).checked;
	const screenshotEnabled = (document.getElementById('screenshotEnabled') as HTMLInputElement)
		.checked;
	const mouseKeyboardEnabled = (document.getElementById('mouseKeyboardEnabled') as HTMLInputElement)
		.checked;
	const browserEnabled = (document.getElementById('browserEnabled') as HTMLInputElement).checked;
	const logLevel = (document.getElementById('logLevel') as HTMLSelectElement).value as LogLevel;

	return {
		instanceUrl,
		filesystemDir,
		filesystemEnabled,
		shellEnabled,
		screenshotEnabled,
		mouseKeyboardEnabled,
		browserEnabled,
		logLevel,
	};
}

function readConnectPayload(): ConnectPayload {
	const url = (document.getElementById('instanceUrl') as HTMLInputElement).value.trim();
	const rawApiKey = (document.getElementById('gatewayKey') as HTMLInputElement).value.trim();
	const apiKey = rawApiKey.length > 0 ? rawApiKey : undefined;
	return { url, apiKey };
}

function populateForm(settings: AppSettings): void {
	(document.getElementById('instanceUrl') as HTMLInputElement).value = settings.instanceUrl;
	(document.getElementById('gatewayKey') as HTMLInputElement).value = '';
	(document.getElementById('filesystemDir') as HTMLInputElement).value = settings.filesystemDir;
	(document.getElementById('filesystemEnabled') as HTMLInputElement).checked =
		settings.filesystemEnabled;
	(document.getElementById('shellEnabled') as HTMLInputElement).checked = settings.shellEnabled;
	(document.getElementById('screenshotEnabled') as HTMLInputElement).checked =
		settings.screenshotEnabled;
	(document.getElementById('mouseKeyboardEnabled') as HTMLInputElement).checked =
		settings.mouseKeyboardEnabled;
	(document.getElementById('browserEnabled') as HTMLInputElement).checked = settings.browserEnabled;
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
			instanceUrl: initial.instanceUrl,
			filesystemDir: initial.filesystemDir,
			filesystemEnabled: initial.filesystemEnabled,
			shellEnabled: initial.shellEnabled,
			screenshotEnabled: initial.screenshotEnabled,
			mouseKeyboardEnabled: initial.mouseKeyboardEnabled,
			browserEnabled: initial.browserEnabled,
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

	const form = document.getElementById('settingsForm') as HTMLFormElement;
	const updateDirtyState = (): void => {
		const dirty = isFormDirty(initialSettings);
		setRestartNotice(dirty);
		setButtonsState(dirty);
	};
	form.addEventListener('change', updateDirtyState);
	form.addEventListener('input', updateDirtyState);

	document.getElementById('connectBtn')?.addEventListener('click', () => {
		const payload = readConnectPayload();
		void window.electronAPI.connectGateway(payload).then((result) => {
			if (result.ok) {
				(document.getElementById('gatewayKey') as HTMLInputElement).value = '';
			} else {
				alert('Connection failed. See logs for details.');
			}
		});
	});

	document.getElementById('disconnectBtn')?.addEventListener('click', () => {
		void window.electronAPI.disconnectGateway();
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
	window.electronAPI.onFocusGatewayToken(() => {
		const tokenInput = document.getElementById('gatewayKey') as HTMLInputElement | null;
		if (!tokenInput) return;
		tokenInput.focus();
		tokenInput.select();
	});
}

void init().catch((e: unknown) => {
	console.error('Settings init failed:', e);
});
