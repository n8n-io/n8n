const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

function copyTokenizerJsonFiles(baseDir) {
	const targetBaseDir = process.argv[3] || 'dist';
	// Make sure the target directory exists
	const targetDir = path.resolve(baseDir, targetBaseDir, 'utils', 'tokenizer');
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}
	// Copy all tokenizer JSON files
	const files = glob.sync('src/utils/tokenizer/*.json', { cwd: baseDir });
	for (const file of files) {
		const sourcePath = path.resolve(baseDir, file);
		const targetPath = path.resolve(baseDir, targetBaseDir, file.replace('src/', ''));
		fs.copyFileSync(sourcePath, targetPath);
		console.log(`Copied: ${file} -> ${targetPath.replace(baseDir, '')}`);
	}
}

copyTokenizerJsonFiles(process.argv[2] || '.');
