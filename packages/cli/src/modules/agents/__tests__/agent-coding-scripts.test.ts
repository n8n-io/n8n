import { execFile } from 'node:child_process';
import { access, chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
	AgentCodingConfigSchema,
	DEFAULT_CODING_CHECK_TIMEOUT_MINUTES,
	N8N_CODING_DEFAULTS,
} from '@n8n/api-types';

import {
	CODING_NODE_VERSION,
	CODING_PNPM_VERSION,
	buildDownloadFunction,
	buildLaunchCommand,
	buildLaunchScript,
	buildNodeBootstrap,
	buildNodeMajorCheck,
	buildPnpmBootstrap,
	buildSetupBootstrap,
	buildStatusCommand,
	buildStopCommand,
	codingCheckTimeLimitSeconds,
} from '../agent-coding-scripts';
import { CODING_FACTS_SCRIPT, CODING_STOP_SCRIPT } from '../agent-coding-sandbox-scripts';
import { createToolDir, makeTempDir, runBash } from './test-utils/coding-sandbox';

const exec = promisify(execFile);

const n8nConfig = AgentCodingConfigSchema.parse({
	repositoryUrl: 'https://github.com/n8n-io/n8n.git',
	...N8N_CODING_DEFAULTS,
});
const otherConfig = AgentCodingConfigSchema.parse({
	repositoryUrl: 'https://example.invalid/demo.git',
});

let directory: string;
const toolDirs: string[] = [];

beforeEach(async () => {
	directory = await makeTempDir('n8n-coding-scripts-');
});

afterEach(async () => {
	for (const tools of toolDirs.splice(0)) await rm(tools, { recursive: true, force: true });
	await rm(directory, { recursive: true, force: true });
});

async function tools(names: string[], fakes: Record<string, string> = {}) {
	const created = await createToolDir(names, fakes);
	toolDirs.push(created);
	return created;
}

async function exists(path: string) {
	return await access(path).then(
		() => true,
		() => false,
	);
}

/** Checks the syntax of a generated script with `bash -n`, without running it. */
async function syntaxCheck(script: string) {
	const file = join(directory, `syntax-${Math.random().toString(36).slice(2)}.sh`);
	await writeFile(file, script);
	return await exec('/bin/bash', ['-n', file]).then(
		() => '',
		(error: { stderr: string }) => error.stderr,
	);
}

/** Creates a gzip archive that looks like a Node.js release with one top folder. */
async function fakeNodeArchive() {
	const top = `node-v${CODING_NODE_VERSION}-linux-x64`;
	const bin = join(directory, 'release', top, 'bin');
	await mkdir(bin, { recursive: true });
	await writeFile(join(bin, 'node'), `#!/bin/sh\necho v${CODING_NODE_VERSION}\n`);
	await chmod(join(bin, 'node'), 0o755);
	const archive = join(directory, 'node.tar.gz');
	await exec('tar', ['-czf', archive, '-C', join(directory, 'release'), top]);
	return archive;
}

const STRICT = 'set -e\nset -o pipefail';
const STUB_DOWNLOAD = 'coding_download() { printf "%s\\n" "$1" >> "$URLS"; cat "$ARCHIVE"; }';
const BOOTSTRAP_TOOLS = ['uname', 'sed', 'tar', 'gzip', 'rm', 'mkdir', 'mv', 'cat'];

describe('generated scripts', () => {
	it('have valid bash syntax', async () => {
		const workspaceRoot = '/workspace with space';
		const meta = `${workspaceRoot}/.coding`;
		const scripts = [
			buildLaunchScript({
				workspaceRoot,
				meta,
				name: 'setup',
				command: 'pnpm install',
				bootstrap: buildSetupBootstrap(n8nConfig, workspaceRoot, meta),
			}),
			buildLaunchScript({
				workspaceRoot,
				meta,
				name: 'check',
				command: 'pnpm typecheck',
				timeLimitSeconds: 1800,
			}),
			buildLaunchCommand({
				meta,
				name: 'app',
				script: `${meta}/app.sh`,
				lock: "exec 9>'/workspace with space/.coding/preview.lock'\nflock -w 30 9 || exit 1",
				beforeLaunch: buildStopCommand(workspaceRoot, meta, true),
			}),
			buildStatusCommand({ workspaceRoot, port: 8080, probePath: '/', mode: 'sessions' }),
		];
		for (const script of scripts) expect(await syntaxCheck(script)).toBe('');
	});

	it('embed Node.js programs with valid JavaScript syntax', async () => {
		for (const [name, script] of Object.entries({ CODING_FACTS_SCRIPT, CODING_STOP_SCRIPT })) {
			const file = join(directory, `${name}.js`);
			await writeFile(file, script);
			await expect(exec(process.execPath, ['--check', file])).resolves.toBeDefined();
		}
	});

	it('bootstraps Node.js only for the n8n repository', () => {
		expect(buildSetupBootstrap(n8nConfig, '/w', '/w/.coding')).toContain('nodejs.org/dist');
		expect(buildSetupBootstrap(otherConfig, '/w', '/w/.coding')).not.toContain('nodejs.org');
		expect(buildSetupBootstrap(otherConfig, '/w', '/w/.coding')).toContain('get.pnpm.io');
	});

	it('uses the configured check time limit', () => {
		expect(codingCheckTimeLimitSeconds({ ...otherConfig, checkTimeoutMinutes: 3 })).toBe(180);
		expect(codingCheckTimeLimitSeconds({ ...n8nConfig, checkTimeoutMinutes: 3 })).toBe(180);
	});

	it('uses the default limit of the repository when the config has none', () => {
		const savedN8nConfig = { ...n8nConfig, checkTimeoutMinutes: undefined };
		expect(codingCheckTimeLimitSeconds(otherConfig)).toBe(
			DEFAULT_CODING_CHECK_TIMEOUT_MINUTES * 60,
		);
		expect(codingCheckTimeLimitSeconds(savedN8nConfig)).toBe(
			N8N_CODING_DEFAULTS.checkTimeoutMinutes * 60,
		);
	});
});

describe('buildNodeMajorCheck', () => {
	async function major(fakes: Record<string, string>) {
		const path = await tools([], fakes);
		return await runBash(`${STRICT}\n${buildNodeMajorCheck()}\nprintf '%s' "$coding_node_major"`, {
			env: { PATH: path },
		});
	}

	it('gives 0 without an error when PATH has no node', async () => {
		expect(await major({})).toEqual({ code: 0, stdout: '0', stderr: '' });
	});

	it('reads the major version of the node on PATH', async () => {
		expect(await major({ node: 'echo 24' })).toEqual({ code: 0, stdout: '24', stderr: '' });
		expect(await major({ node: 'echo 22' })).toMatchObject({ stdout: '22' });
	});

	it.each([
		['prints text', 'echo v24-nightly'],
		['prints nothing', 'true'],
		['fails', 'echo 24; exit 3'],
	])('gives 0 when node %s', async (_case, script) => {
		expect(await major({ node: script })).toEqual({ code: 0, stdout: '0', stderr: '' });
	});
});

describe('buildNodeBootstrap', () => {
	async function bootstrap(fakes: Record<string, string> = {}) {
		const nodeDir = join(directory, '.coding', 'node');
		const urls = join(directory, 'urls.txt');
		const path = await tools(BOOTSTRAP_TOOLS, fakes);
		const result = await runBash(`${STRICT}\n${STUB_DOWNLOAD}\n${buildNodeBootstrap(nodeDir)}`, {
			env: { PATH: path, URLS: urls, ARCHIVE: await fakeNodeArchive() },
		});
		const downloaded = (await readFile(urls, 'utf8').catch(() => '')).split('\n').filter(Boolean);
		return { result, downloaded, nodeDir };
	}

	it('installs Node.js when PATH has no node, without an integer comparison error', async () => {
		const { result, downloaded, nodeDir } = await bootstrap();

		expect(result.code).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain(`Installing Node.js ${CODING_NODE_VERSION}`);
		expect(downloaded).toHaveLength(1);
		expect(downloaded[0]).toMatch(
			new RegExp(
				`^https://nodejs\\.org/dist/v${CODING_NODE_VERSION}/node-v${CODING_NODE_VERSION}-linux-(x64|arm64|\\w+)\\.tar\\.gz$`,
			),
		);
		expect((await exec(join(nodeDir, 'bin', 'node'))).stdout.trim()).toBe(
			`v${CODING_NODE_VERSION}`,
		);
		expect(await exists(`${nodeDir}.tmp`)).toBe(false);
	});

	it('installs Node.js when PATH has another major version', async () => {
		const { downloaded } = await bootstrap({ node: 'echo 22' });
		expect(downloaded).toHaveLength(1);
	});

	it('keeps the Node.js on PATH when it has the required major version', async () => {
		const { result, downloaded, nodeDir } = await bootstrap({ node: 'echo 24' });
		expect(result.code).toBe(0);
		expect(downloaded).toEqual([]);
		expect(await exists(nodeDir)).toBe(false);
	});

	it('does nothing when Node.js is already installed in the workspace', async () => {
		const nodeDir = join(directory, '.coding', 'node');
		await mkdir(join(nodeDir, 'bin'), { recursive: true });
		await writeFile(join(nodeDir, 'bin', 'node'), '#!/bin/sh\necho v24.0.0\n');
		await chmod(join(nodeDir, 'bin', 'node'), 0o755);

		const { downloaded } = await bootstrap();

		expect(downloaded).toEqual([]);
	});

	it('fails without a partial install when the download fails', async () => {
		const nodeDir = join(directory, '.coding', 'node');
		const path = await tools(BOOTSTRAP_TOOLS);
		const result = await runBash(
			`${STRICT}\ncoding_download() { echo 'Download failed' >&2; return 1; }\n${buildNodeBootstrap(nodeDir)}`,
			{ env: { PATH: path } },
		);

		expect(result.code).not.toBe(0);
		expect(result.stderr).toContain('Download failed');
		expect(await exists(join(nodeDir, 'bin', 'node'))).toBe(false);
	});
});

describe('buildPnpmBootstrap', () => {
	const PNPM_TOOLS = ['env', 'bash', 'mkdir', 'touch', 'chmod', 'cat'];

	async function bootstrap(download: string, existing?: 'bin' | 'root') {
		const pnpmHome = join(directory, 'pnpm');
		const calls = join(directory, 'npm-calls.txt');
		if (existing) {
			const folder = existing === 'bin' ? join(pnpmHome, 'bin') : pnpmHome;
			await mkdir(folder, { recursive: true });
			await writeFile(join(folder, 'pnpm'), '#!/bin/sh\n');
			await chmod(join(folder, 'pnpm'), 0o755);
		}
		const path = await tools(PNPM_TOOLS, { npm: `printf '%s\\n' "$*" >> "${calls}"` });
		const result = await runBash(
			`${STRICT}\nexport PNPM_HOME='${pnpmHome}'\ncoding_download() { ${download}; }\n${buildPnpmBootstrap(join(directory, 'bashrc'))}`,
			{ env: { PATH: path } },
		);
		const npmCalls = (await readFile(calls, 'utf8').catch(() => '')).split('\n').filter(Boolean);
		return { result, npmCalls, pnpmHome };
	}

	it('installs pnpm with npm into PNPM_HOME/bin when the installer is not reachable', async () => {
		const { result, npmCalls, pnpmHome } = await bootstrap('return 22');

		expect(result.code).toBe(0);
		expect(result.stdout).toContain('Installing pnpm');
		expect(npmCalls).toEqual([`install -g --prefix ${pnpmHome} pnpm@${CODING_PNPM_VERSION}`]);
	});

	it('uses the pnpm installer when it is reachable', async () => {
		const installer =
			'printf \'%s\\n\' \'mkdir -p "$PNPM_HOME" && echo "$PNPM_VERSION" > "$PNPM_HOME/version"\'';
		const { result, npmCalls, pnpmHome } = await bootstrap(installer);

		expect(result.code).toBe(0);
		expect(npmCalls).toEqual([]);
		expect((await readFile(join(pnpmHome, 'version'), 'utf8')).trim()).toBe(CODING_PNPM_VERSION);
	});

	it.each(['bin', 'root'] as const)(
		'does nothing when pnpm is already in the %s folder of PNPM_HOME',
		async (existing) => {
			const { result, npmCalls } = await bootstrap('echo unexpected >&2; return 1', existing);
			expect(result).toMatchObject({ code: 0, stderr: '' });
			expect(npmCalls).toEqual([]);
		},
	);
});

describe('buildDownloadFunction', () => {
	let server: Server;
	let baseUrl: string;

	beforeAll(async () => {
		server = createServer((request, response) => {
			if (request.url === '/moved') {
				response.writeHead(302, { location: '/file' });
				response.end();
			} else if (request.url === '/file') response.end('downloaded body');
			else {
				response.writeHead(404);
				response.end();
			}
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const address = server.address();
		baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	async function download(url: string, names: string[], fakes: Record<string, string> = {}) {
		const path = await tools(names, fakes);
		return await runBash(`${buildDownloadFunction()}\ncoding_download '${url}'`, {
			env: { PATH: path },
		});
	}

	it('uses curl when it is available', async () => {
		const result = await download(`${baseUrl}/file`, ['node'], {
			curl: 'echo "curl $*"',
			wget: 'echo "wget $*"',
		});
		expect(result.stdout.trim()).toBe(`curl -fsSL ${baseUrl}/file`);
	});

	it('uses wget when curl is missing', async () => {
		const result = await download(`${baseUrl}/file`, ['node'], { wget: 'echo "wget $*"' });
		expect(result.stdout.trim()).toBe(`wget -qO- ${baseUrl}/file`);
	});

	it('uses Node.js and follows redirects when curl and wget are missing', async () => {
		const result = await download(`${baseUrl}/moved`, ['node']);
		expect(result).toEqual({ code: 0, stdout: 'downloaded body', stderr: '' });
	});

	it('fails with the HTTP status when the Node.js download gets an error response', async () => {
		const result = await download(`${baseUrl}/missing`, ['node']);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Download failed with HTTP 404');
	});

	it('fails with a clear message when no download tool exists', async () => {
		const result = await download(`${baseUrl}/file`, []);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Add curl, wget or Node.js to the sandbox image');
	});
});
