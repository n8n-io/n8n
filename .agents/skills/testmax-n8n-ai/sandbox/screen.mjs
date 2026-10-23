// Run an interactive CLI inside tmux and record its screen as an asciinema v2 file.
//
//   node screen.mjs run <dir>      start tmux, record, and wait for <dir>/stop or the CLI exit
//   node screen.mjs launch <dir>   (inside tmux) start the command in <dir>/command.json
//   node screen.mjs record <dir>   (tmux pipe-pane) write the pane output to <dir>/screen.cast
//
// <dir>/command.json is {"argv": [...], "cols": 120, "rows": 36, "input": "prompt",
// "readyText": "text on the screen when the CLI accepts input", "settleMs": 0}. tmux answers the terminal
// queries of the CLI, so the CLI behaves as in a real terminal. The recording has the raw
// output of the CLI, so a player shows the exact screen.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [mode, dir] = process.argv.slice(2);
const command = JSON.parse(readFileSync(join(dir, 'command.json'), 'utf8'));
const READY = '/tmp/screen-ready';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmux = (...args) => spawnSync('tmux', args, { stdio: 'inherit' }).status;
const screenText = () =>
	spawnSync('tmux', ['capture-pane', '-p', '-t', 'run'], { encoding: 'utf8' }).stdout ?? '';

// The CLIs connect MCP servers in the background. A prompt on the command line can start
// before the n8n tools exist, so the prompt is pasted when the input box is ready.
async function typePrompt({ input, readyText, settleMs = 0 }) {
	const deadline = Date.now() + 60_000;
	while (readyText && !screenText().includes(readyText) && Date.now() < deadline) await sleep(250);
	await sleep(settleMs);
	tmux('set-buffer', '-b', 'prompt', '--', input);
	tmux('paste-buffer', '-p', '-d', '-b', 'prompt', '-t', 'run');
	await sleep(500);
	tmux('send-keys', '-t', 'run', 'Enter');
}

if (mode === 'record') {
	const out = createWriteStream(join(dir, 'screen.cast'));
	out.write(
		JSON.stringify({
			version: 2,
			width: command.cols,
			height: command.rows,
			timestamp: Math.floor(Date.now() / 1000),
			env: { TERM: 'xterm-256color' },
		}) + '\n',
	);
	const start = process.hrtime.bigint();
	const decoder = new TextDecoder('utf-8');
	process.stdin.on('data', (chunk) => {
		const text = decoder.decode(chunk, { stream: true });
		if (!text) return;
		const t = Number(process.hrtime.bigint() - start) / 1e9;
		out.write(JSON.stringify([Number(t.toFixed(6)), 'o', text]) + '\n');
	});
	process.stdin.on('end', () => out.end());
} else if (mode === 'launch') {
	while (!existsSync(READY)) await sleep(50);
	const [bin, ...args] = command.argv;
	const child = spawn(bin, args, { stdio: 'inherit' });
	child.on('exit', (code) => {
		writeFileSync(join(dir, 'exited'), String(code ?? 1));
		process.exit(code ?? 1);
	});
	// A CLI that cannot start emits error, not exit. Without the marker, the run waits for ever.
	child.on('error', (error) => {
		console.error(`Cannot start ${bin}: ${error.message}`);
		writeFileSync(join(dir, 'exited'), '127');
		process.exit(127);
	});
} else if (mode === 'run') {
	const self = new URL(import.meta.url).pathname;
	// mouse and focus-events stop the tmux tips that Claude Code shows in the recorded screen.
	writeFileSync(
		'/tmp/tmux.conf',
		'set -g status off\nset -g default-terminal xterm-256color\nset -g mouse on\nset -g focus-events on\n',
	);
	tmux(
		'-f',
		'/tmp/tmux.conf',
		'new-session',
		'-d',
		'-s',
		'run',
		'-x',
		String(command.cols),
		'-y',
		String(command.rows),
		`node ${self} launch ${dir}`,
	);
	// A watcher in another terminal size must not resize the recorded screen. tmux 3.5 stops
	// when this option is in the startup config, so it is set after the session starts.
	tmux('set-option', '-g', 'window-size', 'manual');
	tmux('pipe-pane', '-O', '-t', 'run', `node ${self} record ${dir}`);
	writeFileSync(READY, '');
	if (command.input) await typePrompt(command);
	while (!existsSync(join(dir, 'stop')) && !existsSync(join(dir, 'exited'))) await sleep(500);
	// Keep the final screen in the recording for a moment.
	await sleep(2500);
	tmux('kill-server');
	await sleep(500);
}
