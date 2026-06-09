import { logger } from '@n8n/computer-use/logger';
import { app, Menu, nativeImage, Tray, type Rectangle } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { DaemonController, DaemonStatus, StatusSnapshot } from './daemon-controller';

const ICON_NAMES: Record<DaemonStatus, string> = {
	connected: 'tray-connected',
	connecting: 'tray-waiting',
	disconnected: 'tray-disconnected',
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

/**
 * Create the tray icon. Left-click toggles the main window anchored to the tray (the app's
 * primary surface); right-click offers a minimal Quit. On Linux, where the tray emits no
 * click/right-click events, an Open + Quit context menu provides the same actions. The icon
 * reflects connection status.
 */
export function createTray(
	controller: DaemonController,
	onToggle: (trayBounds: Rectangle) => void,
	onQuit: () => void,
): Tray {
	const tray = new Tray(getTrayIcon('disconnected'));
	tray.setToolTip('n8n Assistant');

	tray.on('click', () => onToggle(tray.getBounds()));
	tray.on('right-click', () => {
		tray.popUpContextMenu(Menu.buildFromTemplate([{ label: 'Quit', click: onQuit }]));
	});

	// Linux trays don't emit click/right-click events; a menu set via setContextMenu is the only
	// reliable interaction there, so expose Open + Quit that way (mac/Windows keep click handlers).
	if (process.platform === 'linux') {
		tray.setContextMenu(
			Menu.buildFromTemplate([
				{ label: 'Open n8n Assistant', click: () => onToggle(tray.getBounds()) },
				{ type: 'separator' },
				{ label: 'Quit', click: onQuit },
			]),
		);
	}

	const update = (snapshot: StatusSnapshot): void => {
		logger.debug('Tray updating', { status: snapshot.status });
		tray.setImage(getTrayIcon(snapshot.status));
	};
	controller.on('statusChanged', update);
	update(controller.getSnapshot());

	return tray;
}
