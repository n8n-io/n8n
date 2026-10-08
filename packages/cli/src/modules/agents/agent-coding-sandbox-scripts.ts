// Node.js programs that run inside the coding sandbox with `node - <args> <<'JS'`.
// A plain n8n sandbox image has Node.js but not always python3 or curl. The programs use only
// CommonJS and core modules, so any Node.js version that the image ships can run them.
// They collect raw facts only. agent-coding-status.ts makes every status decision.

/**
 * Fields of /proc/<pid>/stat after the command name: state, parent PID, process group, ...
 * An exited process that nobody reaped stays as a zombie ('Z'). It still answers kill(pid, 0),
 * but it does not run. Detached scripts often become zombies when PID 1 does not reap orphans.
 */
const PROC_STAT_JS = `function procStat(pid) {
	try {
		const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
		return stat.slice(stat.lastIndexOf(') ') + 2).split(' ');
	} catch {
		return null;
	}
}`;

/**
 * Identifies the current sandbox run: the kernel boot id plus the start time of PID 1 (field 22
 * of /proc/1/stat). A crash restart or a wake after an idle stop changes it, but the files in the
 * workspace stay. coding_incarnation() in agent-coding-scripts.ts must print the same value.
 */
const INCARNATION_JS = `function incarnation() {
	let boot = '';
	try {
		boot = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
	} catch {}
	const init = procStat(1);
	return boot + ':' + ((init && init[19]) || '');
}`;

/** Prints `{ incarnation, status }` or `{ incarnation, sessions, branches }` as JSON. */
export const CODING_FACTS_SCRIPT = `'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const childProcess = require('child_process');
const [workspace, portText, probePath, mode, sessionId] = process.argv.slice(2);
const globalMeta = path.join(workspace, '.coding');
${PROC_STAT_JS}
${INCARNATION_JS}
function read(file) {
	try {
		return fs.readFileSync(file, 'utf8').trim();
	} catch {
		return null;
	}
}
function heartbeatAge(file) {
	try {
		return Date.now() - fs.statSync(file).mtimeMs;
	} catch {
		return null;
	}
}
function alive(pidText) {
	if (!/^\\d+$/.test(pidText || '') || Number(pidText) <= 1) return false;
	try {
		process.kill(Number(pidText), 0);
	} catch {
		return false;
	}
	const stat = procStat(pidText);
	return !stat || stat[0] !== 'Z';
}
function processFacts(meta, name) {
	const file = (suffix) => path.join(meta, name + '.' + suffix);
	const pid = read(file('pid'));
	return {
		pid,
		exit: read(file('exit')),
		stopped: read(file('stopped')),
		started: read(file('started')),
		heartbeatAgeMs: heartbeatAge(file('heartbeat')),
		alive: alive(pid),
	};
}
function git(repo, args) {
	const result = childProcess.spawnSync('git', ['-C', repo].concat(args), { maxBuffer: 268435456 });
	return result.stdout ? result.stdout.toString('utf8') : '';
}
// \\n, \\r and \\r\\n end a line. A final line break does not add a line.
function countLines(data) {
	let lines = 0;
	for (let index = 0; index < data.length; index++) {
		if (data[index] === 10) lines++;
		else if (data[index] === 13) {
			lines++;
			if (data[index + 1] === 10) index++;
		}
	}
	const last = data[data.length - 1];
	return data.length > 0 && last !== 10 && last !== 13 ? lines + 1 : lines;
}
// Count lines only in regular text files up to 1 MiB. Links, binary and large files count as 0.
function untracked(repo) {
	const files = git(repo, ['ls-files', '--others', '--exclude-standard', '-z']).split('\\0');
	return files.filter(Boolean).map((file) => {
		let additions = 0;
		try {
			const target = path.join(repo, file);
			const stat = fs.lstatSync(target);
			if (stat.isFile() && stat.size <= 1048576) {
				const data = fs.readFileSync(target);
				if (data.indexOf(0) === -1) additions = countLines(data);
			}
		} catch {}
		return { path: file, additions };
	});
}
function metaFacts(session) {
	const original = !session || session.original;
	const meta = original ? globalMeta : path.join(globalMeta, 'sessions', String(session.id));
	const repo = original ? path.join(workspace, 'repo') : path.join(meta, 'repo');
	const base = session ? String(session.baseCommit) : 'HEAD';
	const diff = (format) =>
		git(repo, ['diff', '--no-ext-diff', '--no-renames', format, '-z', base, '--']);
	return {
		stage: read(path.join(meta, 'stage')) || '',
		repoExists: fs.existsSync(path.join(repo, '.git')),
		appResponds: false,
		processes: {
			setup: processFacts(meta, 'setup'),
			app: processFacts(meta, 'app'),
			check: processFacts(meta, 'check'),
		},
		git: {
			branch: git(repo, ['branch', '--show-current']),
			nameStatus: diff('--name-status'),
			numstat: diff('--numstat'),
			porcelain: git(repo, ['status', '--porcelain=v1', '--untracked-files=all', '--no-renames', '-z']),
			untracked: untracked(repo),
		},
	};
}
function probe(port) {
	return new Promise((resolve) => {
		const request = http.get({ host: '127.0.0.1', port, path: probePath, agent: false }, (response) => {
			resolve(response.statusCode < 400);
			response.destroy();
		});
		const timer = setTimeout(() => request.destroy(), 1000);
		request.on('error', () => resolve(false));
		request.on('close', () => {
			clearTimeout(timer);
			resolve(false);
		});
	});
}
function sessionsOutput(all) {
	const directory = path.join(globalMeta, 'sessions');
	const sessions = [];
	for (const id of fs.existsSync(directory) ? fs.readdirSync(directory).sort() : []) {
		const text = read(path.join(directory, id, 'session.json'));
		if (text === null) continue;
		const session = JSON.parse(text);
		// Chat files only point to their worktree. A worktree file must match its folder.
		if (!session || typeof session !== 'object' || 'worktreeId' in session || session.id !== id) continue;
		const status = metaFacts(session);
		all.push(status);
		sessions.push({ session, status });
	}
	const refs = ['for-each-ref', '--format=%(refname:short)', 'refs/heads/', 'refs/remotes/origin/'];
	return { incarnation: incarnation(), sessions, branches: git(path.join(workspace, 'repo'), refs) };
}
function statusOutput(all) {
	const text = sessionId ? read(path.join(globalMeta, 'sessions', sessionId, 'session.json')) : null;
	if (sessionId && text === null) throw new Error('Coding session ' + sessionId + ' not found');
	const status = metaFacts(text === null ? null : JSON.parse(text));
	all.push(status);
	return { incarnation: incarnation(), status };
}
async function main() {
	const all = [];
	const output = mode === 'sessions' ? sessionsOutput(all) : statusOutput(all);
	for (const status of all) {
		if (status.processes.app.alive) status.appResponds = await probe(Number(portText));
	}
	process.stdout.write(JSON.stringify(output), () => process.exit(0));
}
main().catch((error) => {
	process.stderr.write(String((error && error.stack) || error) + '\\n');
	process.exit(1);
});`;

/**
 * Stops the app of the current coding session, or of every session with `all`. Arguments: the
 * shared metadata folder, the metadata folder of the current session, and 'all' or 'current'.
 */
export const CODING_STOP_SCRIPT = `'use strict';
const fs = require('fs');
const path = require('path');
const [globalMeta, currentMeta, scope] = process.argv.slice(2);
${PROC_STAT_JS}
${INCARNATION_JS}
function read(file) {
	try {
		return fs.readFileSync(file, 'utf8').trim();
	} catch {
		return '';
	}
}
// Without /proc, any member that answers a signal counts as running.
function groupRunning(pgid) {
	if (!signal(-pgid, 0)) return false;
	if (!fs.existsSync('/proc/self/stat')) return true;
	return fs.readdirSync('/proc').some((entry) => {
		const stat = /^\\d+$/.test(entry) ? procStat(entry) : null;
		return stat !== null && stat[0] !== 'Z' && Number(stat[2]) === pgid;
	});
}
function signal(target, name) {
	try {
		process.kill(target, name);
		return true;
	} catch {
		return false;
	}
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function terminate(pid) {
	// Just after a launch the process can still be on its way to setsid, so its group does not exist yet.
	let signalled = signal(-pid, 'SIGTERM');
	for (let attempt = 0; !signalled && attempt < 20 && signal(pid, 0); attempt++) {
		await delay(50);
		signalled = signal(-pid, 'SIGTERM');
	}
	if (!signalled) return;
	for (let attempt = 0; attempt < 20; attempt++) {
		await delay(100);
		if (!groupRunning(pid)) return;
	}
	signal(-pid, 'SIGKILL');
}
function metas() {
	if (scope !== 'all') return [currentMeta];
	const directory = path.join(globalMeta, 'sessions');
	const ids = fs.existsSync(directory) ? fs.readdirSync(directory).sort() : [];
	return [globalMeta].concat(ids.map((id) => path.join(directory, id)));
}
async function main() {
	const current = incarnation();
	for (const meta of metas()) {
		const file = (suffix) => path.join(meta, 'app.' + suffix);
		if (!fs.existsSync(file('pid'))) continue;
		const text = read(file('pid'));
		const pid = /^\\d+$/.test(text) ? Number(text) : 0;
		const running = !fs.existsSync(file('exit')) && !fs.existsSync(file('stopped'));
		// Mark the stop first. The app then exits with 143, which a status read must not show as an error.
		fs.writeFileSync(file('stopped'), 'stopped');
		// After a sandbox restart the PID can belong to another process. Signal only an app of this run.
		if (running && pid > 1 && read(file('started')) === current) await terminate(pid);
	}
}
main().catch((error) => {
	process.stderr.write(String((error && error.stack) || error) + '\\n');
	process.exit(1);
});`;
