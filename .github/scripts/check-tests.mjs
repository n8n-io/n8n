import { readFile } from 'fs/promises';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import { glob } from 'glob';
import ts from 'typescript';

const execAsync = util.promisify(exec);

const filterAsync = async (asyncPredicate, arr) => {
	const filterResults = await Promise.all(
		arr.map(async (item) => ({
			item,
			shouldKeep: await asyncPredicate(item),
		})),
	);

	return filterResults.filter(({ shouldKeep }) => shouldKeep).map(({ item }) => item);
};

const isAbstractClass = (node) => {
	if (ts.isClassDeclaration(node)) {
		return (
			node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword) || false
		);
	}
	return false;
};

const isAbstractMethod = (node) => {
	return (
		ts.isMethodDeclaration(node) &&
		Boolean(node.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword))
	);
};

// Function to check if a file has a function declaration, function expression, object method or class
const hasFunctionOrClass = async (filePath) => {
	const fileContent = await readFile(filePath, 'utf-8');
	const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

	let hasFunctionOrClass = false;
	const visit = (node) => {
		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			(ts.isMethodDeclaration(node) && !isAbstractMethod(node)) ||
			(ts.isClassDeclaration(node) && !isAbstractClass(node))
		) {
			hasFunctionOrClass = true;
		}
		node.forEachChild(visit);
	};

	visit(sourceFile);

	return hasFunctionOrClass;
};

const main = async () => {
	// Run a git command to get a list of all changed files in the branch (branch has to be up to date with master)
	const changedFiles = await execAsync(
		'git diff --name-only --diff-filter=d origin/master..HEAD',
	).then(({ stdout }) => stdout.trim().split('\n').filter(Boolean));

	// Get all .spec.ts and .test.ts files from the packages
	const specAndTestTsFiles = await glob('packages/*/**/{test,__tests__}/**/*.{spec,test}.ts');
	const specAndTestTsFilesNames = specAndTestTsFiles.map((file) =>
		path.parse(file).name.replace(/\.(test|spec)/, ''),
	);

	// Filter out the .ts and .vue files from the changed files
	const changedVueFiles = changedFiles.filter((file) => file.endsWith('.vue'));
	// .ts files with any kind of function declaration or class and not in any of the test folders
	const changedTsFilesWithFunction = await filterAsync(
		async (filePath) =>
			filePath.endsWith('.ts') &&
			!(await glob('packages/*/**/{test,__tests__}/*.ts')).includes(filePath) &&
			(await hasFunctionOrClass(filePath)),
		changedFiles,
	);

	// For each .ts or .vue file, check if there's a corresponding .test.ts or .spec.ts file in the repository
	const missingTests = changedVueFiles
		.concat(changedTsFilesWithFunction)
		.reduce((filesList, nextFile) => {
			const fileName = path.parse(nextFile).name;

			if (!specAndTestTsFilesNames.includes(fileName)) {
				filesList.push(nextFile);
			}

			return filesList;
		}, []);

	if (missingTests.length) {
		console.error(`Missing tests for:\n${missingTests.join('\n')}`);
		process.exit(1);
	}
};

main();
