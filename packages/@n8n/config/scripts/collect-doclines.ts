import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PropertyDeclaration } from 'ts-morph';
import { Project, Node } from 'ts-morph';

function getPropertyType(classField: PropertyDeclaration) {
	const type = classField.getType();

	if (type.isBoolean()) return 'boolean';
	if (type.isArray()) return 'array';

	if (
		type.isNumber() ||
		(type.isUnion() && type.getUnionTypes().every((t) => t.isNumberLiteral()))
	) {
		return 'number';
	}

	if (
		type.isString() ||
		(type.isUnion() && type.getUnionTypes().every((t) => t.isStringLiteral()))
	) {
		return 'string';
	}

	return 'string';
}

/**
 * Collect doclines from all config classes, i.e. descriptions of env vars decorated with `@Env`.
 *
 * @returns
 * ```json
 * {
 *   "N8N_AUTH_COOKIE_SAMESITE": {
 * 		"description": "This sets the `Samesite` flag on n8n auth cookie",
 * 		"defaultValue": "'lax'",
 * 		"type": "string",
 * 		"sections": []
 * 	}
 * }
 * ```
 */
function collectDoclines() {
	const doclines: Record<string, object> = {};

	const project = new Project({
		tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
		skipAddingFilesFromTsConfig: true,
	});

	project.addSourceFilesAtPaths('src/configs/**/*.ts');
	project.addSourceFilesAtPaths('src/index.ts');

	for (const sourceFile of project.getSourceFiles()) {
		for (const classDeclaration of sourceFile.getClasses()) {
			const hasConfigDecorator = classDeclaration
				.getDecorators()
				.some((d) => d.getName() === 'Config');

			if (!hasConfigDecorator) continue;

			for (const classField of classDeclaration.getProperties()) {
				const envDecorator = classField.getDecorators().find((d) => d.getName() === 'Env');

				if (!envDecorator) continue;

				const args = envDecorator.getArguments();

				if (args.length === 0) continue;

				const zerothArg = args[0];

				if (!Node.isStringLiteral(zerothArg)) continue;

				const envVarName = zerothArg.getLiteralValue();

				const jsDocs = classField.getJsDocs();

				if (jsDocs.length === 0) continue;

				const description = jsDocs[0].getDescription().trim();

				const defaultValue = classField.getInitializer()?.getText() ?? null;

				const type = getPropertyType(classField);

				doclines[envVarName] = {
					description,
					type,
					defaultValue,
					sections: [],
				};
			}
		}
	}

	return doclines;
}

const doclines = collectDoclines();
const OUTPUT_PATH = path.resolve(__dirname, '../config-doclines.json');

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(doclines, null, 2));

console.log(doclines);
console.info(`Config doclines written to ${OUTPUT_PATH}`);
