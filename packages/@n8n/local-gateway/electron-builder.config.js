// The local build is packaged as a separate app (distinct appId + productName, so
// it installs alongside the regular build and keeps its own userData). Driven by
// the same BUNDLE_LOCAL_N8N flag as the renderer/main build variant.
const isLocal = process.env.BUNDLE_LOCAL_N8N === 'true';

/** @type {import('electron-builder').Configuration} */
const config = {
	appId: isLocal ? 'io.n8n.gateway.local' : 'io.n8n.gateway',
	productName: isLocal ? 'n8n Assistant Local' : 'n8n Assistant',
	directories: { output: isLocal ? 'out-local' : 'out' },
	files: ['**/*', '!src/**', '!.turbo/**', '!tsconfig*.json', '!electron-builder.config.js'],
	// Don't run @electron/rebuild: in this monorepo it scans the whole workspace and
	// tries to compile native deps the app never loads (e.g. n8n-core's isolated-vm),
	// which fails against Electron's V8. The app's own native modules ship prebuilds.
	npmRebuild: false,
	mac: {
		category: 'public.app-category.productivity',
		target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
		icon: 'assets/icon.icns',
		extendInfo: {
			LSUIElement: true,
		},
	},
	win: {
		target: [{ target: 'nsis', arch: ['x64'] }],
		icon: 'assets/icon.ico',
	},
};

module.exports = config;
