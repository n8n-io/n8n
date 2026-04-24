const fs = require('fs');

function main() {
	['index.html', 'styles.css'].forEach((f) =>
		fs.copyFileSync('src/renderer/' + f, 'dist/renderer/' + f),
	);
}

main();
