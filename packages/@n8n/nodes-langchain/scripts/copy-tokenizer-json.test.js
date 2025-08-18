const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const baseDir = './test';
const distDir = path.resolve(baseDir, 'dist');
const utilsTokenizerDir = path.resolve(baseDir, 'utils', 'tokenizer');

// Setup test folders and files
beforeAll(() => {
	if (!fs.existsSync(utilsTokenizerDir)) {
		fs.mkdirSync(utilsTokenizerDir, { recursive: true });
	}
	fs.writeFileSync(path.join(utilsTokenizerDir, 'test.json'), JSON.stringify({ test: 'data' }));
});

// Clean up after tests
afterAll(() => {
	fs.rmSync(distDir, { recursive: true, force: true });
	fs.rmSync(utilsTokenizerDir, { recursive: true, force: true });
});

// Test script
it('should copy tokenizer JSON files without console logs', () => {
	const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
	execSync(`node packages/@n8n/nodes-langchain/scripts/copy-tokenizer-json.js ${baseDir}`);

	const copiedFilePath = path.join(distDir, 'utils', 'tokenizer', 'test.json');
	expect(fs.existsSync(copiedFilePath)).toBe(true);

	// Ensure console.log was not called
	expect(consoleSpy).not.toHaveBeenCalled();

	consoleSpy.mockRestore();
});
