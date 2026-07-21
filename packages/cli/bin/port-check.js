// Interactive port-conflict handling for `n8n start` in a terminal. Probes the
// configured port before any config is parsed (base URLs are derived from the
// port at config load, so the switch must happen first). If the port is taken,
// offers to start on the next free one instead of exiting later with
// EADDRINUSE. Non-interactive runs (docker, systemd, CI) are unaffected and
// keep the fail-loudly behavior.
const net = require('net');
const readline = require('readline');

const isFree = (port, host) =>
	new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => server.close(() => resolve(true)));
		server.listen(port, host);
	});

const ask = (question) =>
	new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer);
		});
	});

module.exports = async function offerFreePortOnConflict() {
	const command = process.argv[2] ?? 'start';
	if (command !== 'start') return;
	if (!process.stdin.isTTY || !process.stdout.isTTY) return;

	const port = Number(process.env.N8N_PORT) || 5678;
	const host = process.env.N8N_LISTEN_ADDRESS || '::';
	if (await isFree(port, host)) return;

	// Find the next free adjacent pair, skipping the port right above the taken
	// one: that's the busy instance's task broker (5679 next to 5678), and the
	// pair keeps this instance's main + broker ports side by side too.
	let candidate = port + 2;
	for (; candidate < port + 100; candidate += 2) {
		if ((await isFree(candidate, host)) && (await isFree(candidate + 1, host))) break;
	}
	// Nothing free nearby — fall through to the normal EADDRINUSE error.
	if (candidate >= port + 100) return;

	const answer = await ask(
		`Port ${port} is already in use. Start n8n on port ${candidate} instead? (y/N) `,
	);
	if (!/^y(es)?$/i.test(answer.trim())) return;

	process.env.N8N_PORT = String(candidate);
	if (!process.env.N8N_RUNNERS_BROKER_PORT) {
		process.env.N8N_RUNNERS_BROKER_PORT = String(candidate + 1);
	}
	console.log(`Starting n8n on port ${candidate}\n`);
};
