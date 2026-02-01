/**
 * Post-build script
 *
 * This is a separate script instead of inline npm commands because using "&&"" to chain commands in --onSuccess can cause the watch mode to hang
 */

const { execSync } = require('child_process');

function runCommand(command) {
	try {
		execSync(command, { stdio: 'inherit' });
	} catch (error) {
		console.error(`Command failed: ${command}`);
		process.exit(1);
	}
}

// Run all post-build tasks
runCommand('npx tsc-alias -p tsconfig.build.json');
runCommand('node scripts/copy-tokenizer-json.js .');
runCommand('node ../../nodes-base/scripts/copy-nodes-json.js .');
runCommand('pnpm n8n-copy-static-files');
runCommand('pnpm n8n-generate-metadata');
