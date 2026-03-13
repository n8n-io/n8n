import 'reflect-metadata';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
	switch (command) {
		case 'execute': {
			const { executeCommand } = await import('./commands/execute');
			await executeCommand(args.slice(1));
			break;
		}
		case 'run': {
			const { runCommand } = await import('./commands/run');
			await runCommand(args.slice(1));
			break;
		}
		case 'list': {
			const { listCommand } = await import('./commands/list');
			await listCommand(args.slice(1));
			break;
		}
		case 'inspect': {
			const { inspectCommand } = await import('./commands/inspect');
			await inspectCommand(args.slice(1));
			break;
		}
		case 'watch': {
			const { watchCommand } = await import('./commands/watch');
			await watchCommand(args.slice(1));
			break;
		}
		case 'bench': {
			const { benchCommand } = await import('./commands/bench');
			await benchCommand(args.slice(1));
			break;
		}
		default:
			console.log(`
n8n Engine v2 CLI

Usage:
  engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]
  engine run <file.ts> [--input '{}']
  engine list [--workflow <id>] [--status <status>]
  engine inspect <execution-id>
  engine watch <execution-id>
  engine bench <file.ts> [--iterations 100]
`);
			process.exit(command ? 1 : 0);
	}
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
