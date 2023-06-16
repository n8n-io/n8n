import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import { glob } from "glob";
import parser from '@babel/parser';
import traverse from '@babel/traverse';

const readFileAsync = util.promisify(fs.readFile);
const execAsync = util.promisify(exec);

const filterAsync = async (asyncPredicate, arr) => {
	const filterResults = await Promise.all(arr.map(async item => ({
		item,
		shouldKeep: await asyncPredicate(item)
	})));

	return filterResults.filter(({shouldKeep}) => shouldKeep).map(({item}) => item);
}

// Function to check if a file has a function declaration, function expression, object method or class
const hasFunctionOrClass = async filePath => {
	const code = await readFileAsync(filePath);
	const ast = parser.parse(code, {sourceType: 'module', plugins: ['typescript']});

	let hasFunctionOrClass = false;
	traverse(ast, {
		enter(path) {
			if (
				path.isFunctionDeclaration() ||
				path.isFunctionExpression() ||
				path.isObjectMethod() ||
				path.isClassDeclaration()
			) {
				hasFunctionOrClass = true;
				path.stop();  // stop traversing as soon as we found a function or class
			}
		},
	});

	return hasFunctionOrClass;
}

const program = async () => {

  // Run a git command to get a list of all files in the commit
	const changedFilesCommand = "git diff --name-only --diff-filter=d origin/master..HEAD";
	const changedFiles = await execAsync(changedFilesCommand).then(({stdout}) => stdout.toString().trim().split('\n'));

  // Get all .spec.ts and .test.ts files from the packages
	const specAndTestTsFiles = await glob('../../packages/*/**/{test,__tests__}/*.{spec,test}.ts');
	const specAndTestTsFilesNames = specAndTestTsFiles.map(file => path.parse(file).name.replace(/\.(test|spec)/, ''));

  // Filter out the .ts and .vue files from the changed files, .ts files with any kind of function declaration or class
	const changedVueFiles = changedFiles.filter(file => file.endsWith('.vue'));
	const changedTsFilesWithFunction = await filterAsync(
		async filePath =>
			filePath.endsWith('.ts') &&
			!(await glob('../../packages/*/**/{test,__tests__}/*.ts')).includes(filePath) &&
			await hasFunctionOrClass(filePath),
		changedFiles
	);


  // For each .ts or .vue file, check if there's a corresponding .test.ts or .spec.ts file in the repository
	changedVueFiles.concat(changedTsFilesWithFunction).forEach(async file => {
		const fileName = path.parse(file).name;

		if (!specAndTestTsFilesNames.includes(fileName)) {
			console.error(`No corresponding test file for: ${file}`);
			process.exit(1);
		}
	});
};

program();
