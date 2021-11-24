const { existsSync, promises: { writeFile } } = require('fs');
const path = require('path');
const { task, src, dest } = require('gulp');

const ALLOWED_HEADER_KEYS = ['displayName', 'description'];
const PURPLE_ANSI_COLOR_CODE = 35;

task('build:icons', copyIcons);

function copyIcons() {
	src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'))

	return src('credentials/**/*.{png,svg}').pipe(dest('dist/credentials'));
}

task('build:translations', writeHeaders);

/**
 * Write all node translation headers at `/dist/nodes/headers.js`.
 */
function writeHeaders(done) {
	const { N8N_DEFAULT_LOCALE: locale } = process.env;

	log(`Default locale set to: ${colorize(PURPLE_ANSI_COLOR_CODE, locale || 'en')}`);

	if (!locale || locale === 'en') {
		log('No translation required - Skipping translations build...');
		return done();
	};

	const paths = getTranslationPaths();
	const headers = getHeaders(paths);

	const headersDestinationPath = path.join(__dirname, 'dist', 'nodes', 'headers.js');

	writeDestinationFile(headersDestinationPath, headers);

	log('Headers translation file written to:');
	log(headersDestinationPath, { bulletpoint: true });

	done();
}

function getTranslationPaths() {
	const destinationPaths = require('./package.json').n8n.nodes;
	const { N8N_DEFAULT_LOCALE: locale } = process.env;
	const seen = {};

	return destinationPaths.reduce((acc, cur) => {
		const sourcePath = path.join(
			__dirname,
			cur.split('/').slice(1, -1).join('/'),
			'translations',
			`${locale}.json`,
		);

		if (existsSync(sourcePath) && !seen[sourcePath]) {
			seen[sourcePath] = true;

			const destinationPath = path.join(
				__dirname,
				cur.split('/').slice(0, -1).join('/'),
				'translations',
				`${locale}.json`,
			);

			acc.push({
				source: sourcePath,
				destination: destinationPath,
			});
		};

		return acc;
	}, []);
}

function getHeaders(paths) {
	return paths.reduce((acc, cur) => {
		const translation = require(cur.source);
		const nodeTypes = Object.keys(translation);

		for (const nodeType of nodeTypes) {
			const { header } = translation[nodeType];

			if (isValidHeader(header, ALLOWED_HEADER_KEYS)) {
				acc[nodeType] = header;
			}
		}

		return acc;
	}, {});
}


// ----------------------------------
//             helpers
// ----------------------------------

function isValidHeader(header, allowedHeaderKeys) {
	if (!header) return false;

	const headerKeys = Object.keys(header);

	return headerKeys.length > 0 &&
		headerKeys.every(key => allowedHeaderKeys.includes(key));
}

function writeDestinationFile(destinationPath, data) {
	writeFile(
		destinationPath,
		`module.exports = ${JSON.stringify(data, null, 2)}`,
	);
}

const log = (string, { bulletpoint } = { bulletpoint: false }) => {
	if (bulletpoint) {
		process.stdout.write(
			colorize(PURPLE_ANSI_COLOR_CODE, `- ${string}\n`),
		);
		return;
	};

	process.stdout.write(`${string}\n`);
};

const colorize = (ansiColorCode, string) =>
	['\033[', ansiColorCode, 'm', string, '\033[0m'].join('');
