import { logger } from '@n8n/computer-use/logger';
import { app, Menu, nativeImage, Tray } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { DaemonController, DaemonStatus, StatusSnapshot } from './daemon-controller';

const STATUS_LABELS: Record<DaemonStatus, string> = {
	connected: '', // set dynamically with URL
	connecting: '○  Connecting...',
	disconnected: '✕  Disconnected',
	idle: '■  Idle',
	error: '✕  Error',
};

const ICON_NAMES: Record<DaemonStatus, string> = {
	connected: 'tray-connected',
	connecting: 'tray-waiting',
	disconnected: 'tray-disconnected',
	idle: 'tray-stopped',
	error: 'tray-disconnected',
};

const iconCache = new Map<DaemonStatus, Electron.NativeImage>();

function createNativeImage(status: DaemonStatus): Electron.NativeImage {
	const assetsDir = path.join(app.getAppPath(), 'assets');
	const path1x = path.join(assetsDir, `${ICON_NAMES[status]}.png`);
	const path2x = path.join(assetsDir, `${ICON_NAMES[status]}@2x.png`);

	logger.debug('Loading tray icon', { status, path: path1x });

	// Build a multi-resolution image so Retina displays use the sharp 32×32 @2x variant.
	const img = nativeImage.createEmpty();
	img.addRepresentation({ scaleFactor: 1.0, buffer: fs.readFileSync(path1x) });
	if (fs.existsSync(path2x)) {
		img.addRepresentation({ scaleFactor: 2.0, buffer: fs.readFileSync(path2x) });
	} else {
		logger.warn('Tray icon @2x variant not found — icon may appear blurry on Retina', {
			path: path2x,
		});
	}

	if (img.isEmpty()) {
		logger.warn('Tray icon is empty after loading — placeholder may need replacement', { status });
	}
	if (process.platform === 'darwin') {
		img.setTemplateImage(true);
	}
	return img;
}

function getTrayIcon(status: DaemonStatus): Electron.NativeImage {
	const cached = iconCache.get(status);
	if (cached) return cached;
	const created = createNativeImage(status);
	iconCache.set(status, created);
	return created;
}

function buildStatusLabel(snapshot: StatusSnapshot): string {
	if (snapshot.status === 'connected' && snapshot.connectedUrl) {
		return `●  Connected to ${snapshot.connectedUrl}`;
	}
	return STATUS_LABELS[snapshot.status];
}

function buildMenu(
	controller: DaemonController,
	snapshot: StatusSnapshot,
	onSettings: () => void,
	onStartDaemon: () => void,
	onQuit: () => void,
	onDisconnect: () => void,
): Menu {
	const running = controller.isRunning();
	const connected = snapshot.status === 'connected';
	return Menu.buildFromTemplate([
		{
			label: buildStatusLabel(snapshot),
			enabled: false,
		},
		{ type: 'separator' },
		{
			label: running ? 'Reconnect' : 'Connect',
			click: onStartDaemon,
		},
		{
			label: 'Disconnect',
			visible: connected,
			click: onDisconnect,
		},
		{ type: 'separator' },
		{
			label: 'Settings...',
			click: onSettings,
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			click: onQuit,
		},
	]);
}

export function createTray(
	controller: DaemonController,
	onSettings: () => void,
	onStartDaemon: () => void,
	onQuit: () => void,
	onDisconnect: () => void,
): Tray {
	const tray = new Tray(getTrayIcon('idle'));
	tray.setToolTip('n8n Gateway');

	const update = (snapshot: StatusSnapshot): void => {
		logger.debug('Tray updating', { status: snapshot.status, connectedUrl: snapshot.connectedUrl });
		tray.setImage(getTrayIcon(snapshot.status));
		tray.setContextMenu(
			buildMenu(controller, snapshot, onSettings, onStartDaemon, onQuit, onDisconnect),
		);
	};

	controller.on('statusChanged', update);

	// Build initial menu
	update(controller.getSnapshot());

	return tray;
}
