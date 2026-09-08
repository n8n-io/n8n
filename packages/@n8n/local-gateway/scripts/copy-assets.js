const fs = require('fs');

function main() {
	fs.mkdirSync('./dist/main', { recursive: true });
	fs.cpSync('./assets', './dist/main/assets', { recursive: true });
}

main();
