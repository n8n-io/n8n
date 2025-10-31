const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

function copyModelMetadataFiles(baseDir) {
	const sourceDir = path.resolve(baseDir, 'model-metadata');

	// Check if source directory exists
	if (!fs.existsSync(sourceDir)) {
		console.log('No model-metadata directory found, skipping...');
		return;
	}

	// Make sure the target directory exists
	const targetDir = path.resolve(baseDir, 'dist', 'model-metadata');
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	// Copy all model metadata JSON files
	const files = glob.sync('model-metadata/**/*.json', { cwd: baseDir });

	if (files.length === 0) {
		console.log('No model metadata files found');
		return;
	}

	for (const file of files) {
		const sourcePath = path.resolve(baseDir, file);
		const targetPath = path.resolve(baseDir, 'dist', file);

		// Ensure target subdirectory exists
		const targetSubDir = path.dirname(targetPath);
		if (!fs.existsSync(targetSubDir)) {
			fs.mkdirSync(targetSubDir, { recursive: true });
		}

		fs.copyFileSync(sourcePath, targetPath);
		console.log(`Copied: ${file} -> dist/${file}`);
	}

	console.log(`✓ Copied ${files.length} model metadata files`);
}

copyModelMetadataFiles(process.argv[2] || '.');
