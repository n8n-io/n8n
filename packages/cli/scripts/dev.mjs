import { spawn } from 'node:child_process';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

if (args.includes('--inspect-memory')) {
	const { main } = await import('../../quality/efficiency/memory/session/cli.mjs');
	const { stopOwnedProcess } = await import('../../quality/efficiency/memory/session/record.mjs');
	const compiler = spawn(pnpm, ['run', 'watch', '--preserveWatchOutput'], {
		stdio: ['ignore', 'pipe', 'pipe'],
		detached: process.platform !== 'win32',
	});
	compiler.stdout.pipe(process.stderr);
	compiler.stderr.pipe(process.stderr);
	compiler.on('error', (error) => process.stderr.write(`${error.message}\n`));
	try {
		process.exitCode = await main([
			'record',
			'--dev',
			...args.filter((arg) => arg !== '--inspect-memory'),
		]);
	} finally {
		await stopOwnedProcess(compiler);
	}
} else {
	const child = spawn(
		pnpm,
		[
			'exec',
			'concurrently',
			'-k',
			'-n',
			'TypeScript,Node',
			'-c',
			'yellow.bold,cyan.bold',
			'pnpm run watch',
			'nodemon --delay 1',
			...args,
		],
		{ stdio: 'inherit' },
	);
	child.on('error', (error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
	child.on('exit', (code) => {
		process.exitCode = code ?? 1;
	});
}
