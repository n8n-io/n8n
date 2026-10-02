import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

function parseArgs(argv) {
	const parsed = {
		args: [],
		recordingDir: undefined,
		outputDir: undefined,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--recording-dir' || arg === '-r') {
			parsed.recordingDir = argv[++i];
			continue;
		}
		if (arg === '--output-dir' || arg === '-o') {
			parsed.outputDir = argv[++i];
			continue;
		}
		parsed.args.push(arg);
	}
	return parsed;
}

function recordingDir(cliRecordingDir) {
	return (
		cliRecordingDir ??
		process.env.N8N_AGENT_INTEGRATION_RECORDING_DIR ??
		resolve(process.cwd(), '.agent-recordings', 'channel-integrations')
	);
}

function sanitizeSessionId(value) {
	return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function listSessions(cliRecordingDir) {
	const dir = recordingDir(cliRecordingDir);
	console.log(`Scanning ${dir} for sessions...`);
	let files = [];
	try {
		files = await readdir(dir);
	} catch {
		return [];
	}

	const sessions = await Promise.all(
		files
			.filter((file) => file.endsWith('.jsonl'))
			.map(async (file) => {
				const contents = await readFile(join(dir, file), 'utf8');
				return {
					sessionId: file.slice(0, -'.jsonl'.length),
					entries: contents.split('\n').filter(Boolean).length,
				};
			}),
	);
	return sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

async function exportSession(sessionId, cliRecordingDir) {
	const file = join(recordingDir(cliRecordingDir), `${sanitizeSessionId(sessionId)}.jsonl`);
	const contents = await readFile(file, 'utf8');
	return contents
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

async function writeExport(sessionId, records, outputDir) {
	await mkdir(outputDir, { recursive: true });
	const outputPath = join(outputDir, `${sanitizeSessionId(sessionId)}.json`);
	await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
	return outputPath;
}

function printHelp() {
	console.log(`
Usage:
  node scripts/agent-integration-recordings.mjs --list [--recording-dir <dir>]
  node scripts/agent-integration-recordings.mjs <session-id> [--recording-dir <dir>] [--output-dir <dir>]

Options:
  --recording-dir, -r  Directory containing recording JSONL files
  --output-dir, -o     Directory to write exported JSON files. If omitted, export prints to stdout

Environment:
  N8N_AGENT_INTEGRATION_RECORDING_DIR  Directory containing recording JSONL files
`);
}

const { args, recordingDir: cliRecordingDir, outputDir } = parseArgs(process.argv.slice(2));
const arg = args[0];

try {
	if (arg === '--list' || arg === '-l') {
		const sessions = await listSessions(cliRecordingDir);
		if (sessions.length === 0) {
			console.log('No channel integration recordings found.');
		} else {
			for (const session of sessions) {
				console.log(`${session.sessionId} (${session.entries} entries)`);
			}
		}
	} else if (!arg || arg === '--help' || arg === '-h') {
		printHelp();
	} else {
		const records = await exportSession(arg, cliRecordingDir);
		if (outputDir) {
			const outputPath = await writeExport(arg, records, outputDir);
			console.log(`Exported ${records.length} entries to ${outputPath}`);
		} else {
			console.log(JSON.stringify(records, null, 2));
		}
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
