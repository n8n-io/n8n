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
 * Write node translation headers to single file at `/dist/nodes/headers.js`.
 */
function writeHeaders(done) {
	const { N8N_DEFAULT_LOCALE: locale } = process.env;

	log(`Default locale set to: ${colorize(PURPLE_ANSI_COLOR_CODE, locale || 'en')}`);

	if (!locale || locale === 'en') {
		log('No translation required - Skipping translations build...');
		return done();
	}

	const nodeTranslationPaths = getNodeTranslationPaths();
	const headers = getHeaders(nodeTranslationPaths);
	const headersDistPath = path.join(__dirname, 'dist', 'nodes', 'headers.js');

	writeDistFile(headers, headersDistPath);

	log('Headers file written to:');
	log(headersDistPath, { bulletpoint: true });

	done();
}

function getNodeTranslationPaths() {
	const nodeDistPaths = require('./package.json').n8n.nodes;
	const { N8N_DEFAULT_LOCALE: locale } = process.env;

	return nodeDistPaths.reduce((acc, cur) => {
		const nodeTranslationPath = path.join(
			__dirname,
			cur.split('/').slice(1, -1).join('/'),
			'translations',
			locale,
			toTranslationFile(cur),
		);

		if (existsSync(nodeTranslationPath)) {
			acc.push(nodeTranslationPath);
		};

		return acc;
	}, []);
}

function getHeaders(nodeTranslationPaths) {
	return nodeTranslationPaths.reduce((acc, cur) => {
		const { header } = require(cur);
		const nodeType = cur.split('/').pop().replace('.json', '');

		if (isValidHeader(header, ALLOWED_HEADER_KEYS)) {
			acc[nodeType] = header;
		}

		return acc;
	}, {});
}


// ----------------------------------
//             helpers
// ----------------------------------

function toTranslationFile(distPath) {
	const raw = distPath.split('/').pop().replace('.node', '') + 'on';
	return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function isValidHeader(header, allowedHeaderKeys) {
	if (!header) return false;

	const headerKeys = Object.keys(header);

	return headerKeys.length > 0 &&
		headerKeys.every(key => allowedHeaderKeys.includes(key));
}

function writeDistFile(data, distPath) {
	writeFile(
		distPath,
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
