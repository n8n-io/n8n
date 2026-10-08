import { join } from 'node:path/posix';

import { defaultCodingCheckTimeoutMinutes, type AgentCodingConfig } from '@n8n/api-types';
import { shellEscape } from '@n8n/agents/sandbox';

import { CODING_FACTS_SCRIPT, CODING_STOP_SCRIPT } from './agent-coding-sandbox-scripts';
import {
	CODING_HEARTBEAT_INTERVAL_SECONDS,
	CODING_HEARTBEAT_STALE_SECONDS,
} from './agent-coding-status';

export const CODING_NODE_VERSION = '24.14.0';
// Keep in line with "packageManager" in the root package.json of the n8n repository.
export const CODING_PNPM_VERSION = '12.4.2';

export type CodingProcessName = 'setup' | 'app' | 'check';

/** Exit code that a check writes when it runs longer than its time limit, as coreutils `timeout` does. */
export const CODING_TIME_LIMIT_EXIT_CODE = 124;

/** Prints the sandbox run id. It must match incarnation() in agent-coding-sandbox-scripts.ts. */
const INCARNATION_SH = `coding_incarnation() {
	printf '%s:%s' "$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)" "$(sed 's/.*) //' /proc/1/stat 2>/dev/null | cut -d ' ' -f 20)"
}`;

const NODE_MISSING_MESSAGE =
	'Node.js is not available in this sandbox. Add Node.js to the sandbox image to use coding sessions.';

// Writes the body of a URL to stdout. Follows up to 5 redirects.
const DOWNLOAD_NODE_JS =
	"const get=(url,left)=>require(url.startsWith('https:')?'https':'http').get(url,(response)=>{const next=response.headers.location;if(response.statusCode>=300&&response.statusCode<400&&next&&left>0){response.resume();get(new URL(next,url).toString(),left-1);return}if(response.statusCode!==200){console.error('Download failed with HTTP '+response.statusCode+': '+url);process.exit(1)}response.pipe(process.stdout)}).on('error',(error)=>{console.error(error.message);process.exit(1)});get(process.argv[1],5)";

/** Defines coding_download URL. It uses curl, then wget, then Node.js: a plain image can lack curl. */
export function buildDownloadFunction(): string {
	return `coding_download() {
	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$1"
	elif command -v wget >/dev/null 2>&1; then
		wget -qO- "$1"
	elif command -v node >/dev/null 2>&1; then
		node -e ${shellEscape(DOWNLOAD_NODE_JS)} "$1"
	else
		printf 'Cannot download %s. Add curl, wget or Node.js to the sandbox image.\\n' "$1" >&2
		return 1
	fi
}`;
}

function codingFile(meta: string, name: CodingProcessName, suffix: string): string {
	return join(meta, `${name}.${suffix}`);
}

function sharedPaths(workspaceRoot: string) {
	const sharedMeta = join(workspaceRoot, '.coding');
	return { sharedMeta, nodeDir: join(sharedMeta, 'node'), pnpmHome: join(sharedMeta, 'pnpm') };
}

/**
 * Sets `coding_node_major` to the major version of the `node` on PATH, or to 0 when there is no
 * usable `node`. The value is always an integer, so a numeric comparison cannot fail.
 */
export function buildNodeMajorCheck(): string {
	return [
		'coding_node_major="$(node -p \'process.versions.node.split(".")[0]\' 2>/dev/null)" || coding_node_major=0',
		'case "$coding_node_major" in \'\'|*[!0-9]*) coding_node_major=0 ;; esac',
	].join('\n');
}

/** Installs Node.js 24 into `nodeDir` when neither `nodeDir` nor PATH has it. */
export function buildNodeBootstrap(nodeDir: string): string {
	const target = shellEscape(nodeDir);
	const temporary = shellEscape(`${nodeDir}.tmp`);
	const major = CODING_NODE_VERSION.split('.')[0];
	const url = `https://nodejs.org/dist/v${CODING_NODE_VERSION}/node-v${CODING_NODE_VERSION}-linux-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/').tar.gz`;
	return [
		`if [ ! -x ${shellEscape(join(nodeDir, 'bin/node'))} ]; then`,
		buildNodeMajorCheck(),
		`if [ "$coding_node_major" -ne ${major} ]; then`,
		`printf 'Installing Node.js ${CODING_NODE_VERSION}.\\n'`,
		// Extract to a temporary folder first, so a failed download leaves no partial Node.js.
		`rm -rf ${temporary} && mkdir -p ${temporary}`,
		`coding_download "${url}" | tar -xz -C ${temporary} --strip-components=1`,
		`rm -rf ${target} && mv ${temporary} ${target}`,
		'fi',
		'fi',
	].join('\n');
}

/** Installs pnpm into `$PNPM_HOME`. Uses npm when the pnpm installer is not reachable. */
export function buildPnpmBootstrap(bashrc: string): string {
	return [
		'if [ ! -x "$PNPM_HOME/bin/pnpm" ] && [ ! -x "$PNPM_HOME/pnpm" ]; then',
		`if ! coding_download https://get.pnpm.io/install.sh | env PNPM_VERSION=${CODING_PNPM_VERSION} PNPM_HOME="$PNPM_HOME" SHELL=/bin/bash ENV=${shellEscape(bashrc)} bash; then`,
		`printf 'The pnpm installer is not available. Installing pnpm ${CODING_PNPM_VERSION} with npm.\\n'`,
		// A global install with --prefix puts the binary in $PNPM_HOME/bin, which is on PATH.
		`npm install -g --prefix "$PNPM_HOME" pnpm@${CODING_PNPM_VERSION}`,
		'fi',
		'fi',
	].join('\n');
}

/** Bootstrap for the setup script. Only the n8n repository needs a specific Node.js version. */
export function buildSetupBootstrap(
	config: AgentCodingConfig,
	workspaceRoot: string,
	meta: string,
) {
	const { nodeDir } = sharedPaths(workspaceRoot);
	return [
		buildDownloadFunction(),
		...(config.repositoryUrl.includes('n8n-io/n8n') ? [buildNodeBootstrap(nodeDir)] : []),
		buildPnpmBootstrap(join(meta, 'bashrc')),
	].join('\n');
}

export function codingCheckTimeLimitSeconds(config: AgentCodingConfig): number {
	return (
		(config.checkTimeoutMinutes ?? defaultCodingCheckTimeoutMinutes(config.repositoryUrl)) * 60
	);
}

function describeLimit(seconds: number): string {
	const [value, unit] = seconds % 60 === 0 ? [seconds / 60, 'minute'] : [seconds, 'second'];
	return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

/**
 * Touches the heartbeat while the script runs. With a time limit, it stops the whole process group
 * when the limit passes and records the time-limit exit code.
 */
function buildMonitor(heartbeat: string, exit: string, timeLimitSeconds: number): string {
	const message = `The check ran longer than its time limit of ${describeLimit(timeLimitSeconds)}, so it was stopped. To change the limit, edit the coding settings.`;
	return `coding_time_limit() {
	printf '\\n%s\\n' ${shellEscape(message)}
	trap '' TERM
	kill -TERM -- "-$1" 2>/dev/null || :
	coding_waited=0
	while kill -0 "$1" 2>/dev/null && [ "$coding_waited" -lt 10 ]; do
		sleep 1
		coding_waited=$((coding_waited + 1))
	done
	printf '%s' ${CODING_TIME_LIMIT_EXIT_CODE} > ${shellEscape(exit)}
	kill -KILL -- "-$1" 2>/dev/null || :
}
coding_monitor() {
	coding_elapsed=0
	while kill -0 "$1" 2>/dev/null; do
		touch ${shellEscape(heartbeat)} 2>/dev/null || :
		if [ ${timeLimitSeconds} -gt 0 ] && [ "$coding_elapsed" -ge ${timeLimitSeconds} ]; then
			coding_time_limit "$1"
			return
		fi
		sleep ${CODING_HEARTBEAT_INTERVAL_SECONDS}
		coding_elapsed=$((coding_elapsed + ${CODING_HEARTBEAT_INTERVAL_SECONDS}))
	done
}
coding_monitor "$$" &
coding_monitor_pid=$!`;
}

export interface CodingLaunchScriptOptions {
	workspaceRoot: string;
	meta: string;
	name: CodingProcessName;
	command: string;
	bootstrap?: string;
	/** 0 or missing means no limit. */
	timeLimitSeconds?: number;
}

/** The script that runs detached in the sandbox and records its PID, exit code and heartbeat. */
export function buildLaunchScript(options: CodingLaunchScriptOptions): string {
	const { meta, name } = options;
	const { nodeDir, pnpmHome } = sharedPaths(options.workspaceRoot);
	const exit = codingFile(meta, name, 'exit');
	return [
		'#!/bin/bash',
		'set -e',
		'set -o pipefail',
		// Without these traps, a signal ends bash with $? still 0, and a killed setup reads as passed.
		// Set them before the EXIT trap, so that an early signal leaves no exit code instead of 0.
		"trap 'exit 129' HUP",
		"trap 'exit 130' INT",
		"trap 'exit 143' TERM",
		`coding_exit_file=${shellEscape(exit)}`,
		'trap \'coding_status=$?; kill "$coding_monitor_pid" 2>/dev/null || :; printf "%s" "$coding_status" > "$coding_exit_file"\' EXIT',
		`export PNPM_HOME=${shellEscape(pnpmHome)}`,
		`export PATH="$PNPM_HOME/bin":"$PNPM_HOME":${shellEscape(join(nodeDir, 'bin'))}:"$PATH"`,
		buildMonitor(codingFile(meta, name, 'heartbeat'), exit, options.timeLimitSeconds ?? 0),
		options.bootstrap ?? '',
		options.command,
	].join('\n');
}

export interface CodingLaunchCommandOptions {
	meta: string;
	name: CodingProcessName;
	script: string;
	/** Shell lines that take the preview lock. The launched process does not inherit the lock. */
	lock?: string;
	/** Shell command that runs after the running check and before the launch. */
	beforeLaunch?: string;
}

/** Returns success when the process runs in this sandbox run with a fresh heartbeat. */
const RUNNING_SH = `coding_running() {
	coding_pid="$(cat "$1.pid" 2>/dev/null)" || return 1
	case "$coding_pid" in ''|*[!0-9]*|0|1) return 1 ;; esac
	[ ! -f "$1.exit" ] && [ ! -f "$1.stopped" ] || return 1
	[ "$(cat "$1.started" 2>/dev/null)" = "$(coding_incarnation)" ] || return 1
	[ "$(( $(date +%s) - $(stat -c %Y "$1.heartbeat" 2>/dev/null || echo 0) ))" -le ${CODING_HEARTBEAT_STALE_SECONDS} ] || return 1
	kill -0 "$coding_pid" 2>/dev/null || return 1
	# A zombie answers kill -0 but does not run.
	[ "$(sed 's/.*) //' "/proc/$coding_pid/stat" 2>/dev/null | cut -c 1)" != Z ]
}`;

/**
 * Starts the launch script detached. Does nothing when the process already runs. Writes the run
 * marker and the first heartbeat before the start, so a status read never sees a new process
 * without them.
 */
export function buildLaunchCommand(options: CodingLaunchCommandOptions): string {
	const { meta, name } = options;
	const file = (suffix: string) => shellEscape(codingFile(meta, name, suffix));
	const closeLock = options.lock ? ' 9>&-' : '';
	return [
		'set -e',
		...(options.lock ? [options.lock] : []),
		INCARNATION_SH,
		RUNNING_SH,
		`if coding_running ${shellEscape(join(meta, name))}; then exit 0; fi`,
		...(options.beforeLaunch ? [options.beforeLaunch] : []),
		`rm -f ${['pid', 'exit', 'stopped', 'started', 'heartbeat'].map(file).join(' ')}`,
		`coding_incarnation > ${file('started')}`,
		`touch ${file('heartbeat')}`,
		`nohup setsid bash ${shellEscape(options.script)} > ${file('log')} 2>&1 < /dev/null${closeLock} &`,
		`printf '%s' "$!" > ${file('pid')}`,
	].join('\n');
}

function nodeCommand(workspaceRoot: string, args: string[], script: string): string {
	return [
		`export PATH=${shellEscape(join(sharedPaths(workspaceRoot).nodeDir, 'bin'))}:"$PATH"`,
		`command -v node >/dev/null 2>&1 || { printf '%s\\n' ${shellEscape(NODE_MISSING_MESSAGE)} >&2; exit 127; }`,
		`node - ${args.map(shellEscape).join(' ')} <<'JS'\n${script}\nJS`,
	].join('\n');
}

export interface CodingStatusCommandOptions {
	workspaceRoot: string;
	port: number;
	probePath: string;
	mode: 'status' | 'sessions';
	sessionId?: string;
}

export function buildStatusCommand(options: CodingStatusCommandOptions): string {
	const args = [
		options.workspaceRoot,
		String(options.port),
		options.probePath,
		options.mode,
		options.sessionId ?? '',
	];
	return nodeCommand(options.workspaceRoot, args, CODING_FACTS_SCRIPT);
}

export function buildStopCommand(workspaceRoot: string, meta: string, all: boolean): string {
	const args = [sharedPaths(workspaceRoot).sharedMeta, meta, all ? 'all' : 'current'];
	return nodeCommand(workspaceRoot, args, CODING_STOP_SCRIPT);
}
