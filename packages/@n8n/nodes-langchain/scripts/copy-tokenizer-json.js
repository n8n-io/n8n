const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

function copyTokenizerJsonFiles(baseDir) {
	// Make sure the target directory exists
	const targetDir = path.resolve(baseDir, 'dist', 'utils', 'tokenizer');
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}
	// Copy all tokenizer JSON files
	const files = glob.sync('utils/tokenizer/*.json', { cwd: baseDir });
	for (const file of files) {
		const sourcePath = path.resolve(baseDir, file);
		const targetPath = path.resolve(baseDir, 'dist', file);
		fs.copyFileSync(sourcePath, targetPath);
		console.log(`Copied: ${file} -> dist/${file}`);
	}
}

copyTokenizerJsonFiles(process.argv[2] || '.');
