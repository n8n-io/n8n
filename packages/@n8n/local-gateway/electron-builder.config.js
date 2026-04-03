/** @type {import('electron-builder').Configuration} */
const config = {
	appId: 'io.n8n.gateway',
	productName: 'n8n Gateway',
	directories: { output: 'out' },
	files: ['**/*', '!src/**', '!.turbo/**', '!tsconfig*.json', '!electron-builder.config.js'],
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
