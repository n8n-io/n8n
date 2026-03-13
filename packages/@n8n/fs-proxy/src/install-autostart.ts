#!/usr/bin/env node

/**
 * Postinstall script: registers a platform-specific auto-start entry so the
 * n8n-fs-proxy daemon launches on login.
 *
 * - macOS:   ~/Library/LaunchAgents/com.n8n.fs-proxy.plist
 * - Linux:   ~/.config/systemd/user/n8n-fs-proxy.service
 * - Windows: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\n8n-fs-proxy.vbs
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const SERVICE_NAME = 'n8n-fs-proxy';

function getCliPath(): string {
	return path.resolve(__dirname, 'cli.js');
}

// ── macOS LaunchAgent ────────────────────────────────────────────────────────

function installMacOS(): void {
	const home = os.homedir();
	const label = 'com.n8n.fs-proxy';
	const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
	const plistPath = path.join(launchAgentsDir, `${label}.plist`);
	const cliPath = getCliPath();

	const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${label}</string>
	<key>ProgramArguments</key>
	<array>
		<string>${process.execPath}</string>
		<string>${cliPath}</string>
		<string>serve</string>
		<string>${home}</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>StandardOutPath</key>
	<string>/tmp/${SERVICE_NAME}.log</string>
	<key>StandardErrorPath</key>
	<string>/tmp/${SERVICE_NAME}.log</string>
</dict>
</plist>
`;

	try {
		fs.mkdirSync(launchAgentsDir, { recursive: true });
		fs.writeFileSync(plistPath, plistContent, 'utf-8');

		console.log(`\n${SERVICE_NAME}: LaunchAgent installed at ${plistPath}`);
		console.log('To start it now, run:');
		console.log(`  launchctl load ${plistPath}`);
		console.log('It will auto-start on your next login.\n');
	} catch (error) {
		printFallback('LaunchAgent', error);
	}
}

// ── Linux systemd user service ───────────────────────────────────────────────

function installLinux(): void {
	const home = os.homedir();
	const systemdDir = path.join(home, '.config', 'systemd', 'user');
	const servicePath = path.join(systemdDir, `${SERVICE_NAME}.service`);
	const cliPath = getCliPath();
	const logPath = `/tmp/${SERVICE_NAME}.log`;

	const serviceContent = `[Unit]
Description=n8n Filesystem Proxy Daemon
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${cliPath} serve ${home}
Restart=on-failure
RestartSec=5
StandardOutput=append:${logPath}
StandardError=append:${logPath}

[Install]
WantedBy=default.target
`;

	try {
		fs.mkdirSync(systemdDir, { recursive: true });
		fs.writeFileSync(servicePath, serviceContent, 'utf-8');

		console.log(`\n${SERVICE_NAME}: systemd user service installed at ${servicePath}`);
		console.log('To start it now, run:');
		console.log('  systemctl --user daemon-reload');
		console.log(`  systemctl --user enable --now ${SERVICE_NAME}`);
		console.log('It will auto-start on your next login.\n');
	} catch (error) {
		printFallback('systemd service', error);
	}
}

// ── Windows startup shortcut ─────────────────────────────────────────────────

function installWindows(): void {
	const appData = process.env.APPDATA;
	if (!appData) {
		console.warn(`${SERVICE_NAME}: APPDATA not set — skipping auto-start registration.`);
		console.warn(`You can start the daemon manually with: ${SERVICE_NAME} serve`);
		return;
	}

	const startupDir = path.join(
		appData,
		'Microsoft',
		'Windows',
		'Start Menu',
		'Programs',
		'Startup',
	);
	const vbsPath = path.join(startupDir, `${SERVICE_NAME}.vbs`);
	const cliPath = getCliPath();
	const home = os.homedir();

	// VBScript launcher runs the daemon hidden (no console window flashing)
	const nodeExe = process.execPath.replace(/\\/g, '\\\\');
	const cliEscaped = cliPath.replace(/\\/g, '\\\\');
	const homeEscaped = home.replace(/\\/g, '\\\\');

	const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """${nodeExe}"" ""${cliEscaped}"" serve ""${homeEscaped}""", 0, False
`;

	try {
		fs.mkdirSync(startupDir, { recursive: true });
		fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

		console.log(`\n${SERVICE_NAME}: Startup script installed at ${vbsPath}`);
		console.log('The daemon will auto-start on your next login.');
		console.log(`To start it now, run: ${SERVICE_NAME} serve\n`);
	} catch (error) {
		printFallback('startup script', error);
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function printFallback(mechanism: string, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.warn(`${SERVICE_NAME}: Could not install ${mechanism}: ${message}`);
	console.warn(`You can start the daemon manually with: ${SERVICE_NAME} serve`);
}

function main(): void {
	switch (process.platform) {
		case 'darwin':
			installMacOS();
			break;
		case 'linux':
			installLinux();
			break;
		case 'win32':
			installWindows();
			break;
		default:
			// Unsupported platform — silently skip
			break;
	}
}

main();
