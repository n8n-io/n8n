import { exec } from 'child_process';
import fs from 'fs/promises';
import gulp from 'gulp';
import { promisify } from 'util';

const execAsync = promisify(exec);

// -------------------------------------------------------------------------
// Packaging for Node.js
// -------------------------------------------------------------------------

async function nodeCompile() {
	await execAsync('tsc -p tsconfig.node.json');
}

async function nodeCreateEsmIndex() {
	const buildDir = './build/package';
	const cjsIndex = require(`${buildDir}/index.js`);
	const cjsKeys = Object.keys(cjsIndex).filter((key) => key !== 'default' && !key.startsWith('__'));

	const indexMjsContent =
		'import TypeORM from "./index.js";\n' +
		`const {\n    ${cjsKeys.join(',\n    ')}\n} = TypeORM;\n` +
		`export {\n    ${cjsKeys.join(',\n    ')}\n};\n` +
		'export default TypeORM;\n';

	await fs.writeFile(`${buildDir}/index.mjs`, indexMjsContent, 'utf8');
}

// -------------------------------------------------------------------------
// Packaging
// -------------------------------------------------------------------------

async function copyPackageFile() {
	const pkg = JSON.parse(await fs.readFile('./package.json', 'utf8'));

	delete pkg.devDependencies;
	delete pkg.devEngines;
	delete pkg.packageManager;
	delete pkg.pnpm;
	delete pkg.scripts;
	pkg.private = false;

	await fs.writeFile('./build/package/package.json', JSON.stringify(pkg, null, 2) + '\n');
}

function copyReadme() {
	return gulp.src('./README.md').pipe(gulp.dest('./build/package'));
}

// -------------------------------------------------------------------------
// Tasks
// -------------------------------------------------------------------------

gulp.task(
	'package',
	gulp.series(
		() => fs.rm('./build', { recursive: true, force: true }),
		gulp.parallel(nodeCompile),
		gulp.parallel(nodeCreateEsmIndex, copyPackageFile, copyReadme),
	),
);

gulp.task(
	'pack',
	gulp.series('package', async () => {
		await execAsync('cd ./build/package && npm pack && mv -f *.tgz ..');
	}),
);

gulp.task('clean', () => fs.rm('./build', { recursive: true, force: true }));
