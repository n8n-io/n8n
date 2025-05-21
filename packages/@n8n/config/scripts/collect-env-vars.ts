import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PropertyDeclaration, Type as TsMorphType } from 'ts-morph';
import { Project, Node } from 'ts-morph';

type EnvVars = Record<string, EnvVarEntry>;

interface EnvVarEntry {
	description: string;
	defaultValue: string | number | boolean | null;
	type: string;

	/** Picked up from @sections JSDoc tag */
	sections: string[];

	/** Only if `type` is `enum` */
	enumValues?: string[];
}

const project = new Project({
	tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
	skipAddingFilesFromTsConfig: true,
});

function isStringUnion(type: TsMorphType): boolean {
	return type.isUnion() && type.getUnionTypes().every((t) => t.isStringLiteral());
}

function isNumberUnion(type: TsMorphType): boolean {
	return type.isUnion() && type.getUnionTypes().every((t) => t.isNumberLiteral());
}

function getPropertyType(classField: PropertyDeclaration) {
	const type = classField.getType();

	if (type.isBoolean()) return 'boolean';
	if (type.isArray()) return 'array';
	if (type.isNumber() || isNumberUnion(type)) return 'number';
	if (type.isString() || isStringUnion(type)) return 'string';

	return 'string';
}

function toEnumValues(schemaNode: Node) {
	if (!Node.isIdentifier(schemaNode)) return;

	const symbol = schemaNode.getSymbol();

	if (!symbol) return;

	const declarations = symbol.getDeclarations();

	if (declarations.length === 0) return;

	const varDeclarationNode = declarations[0];

	if (!Node.isVariableDeclaration(varDeclarationNode)) return;

	const varInitializer = varDeclarationNode.getInitializer();

	if (!varInitializer || !Node.isCallExpression(varInitializer)) return;

	const expressionText = varInitializer.getExpression().getText();

	if (!expressionText.endsWith('.enum')) return;

	const enumCallArgs = varInitializer.getArguments();

	if (enumCallArgs.length === 0) return;

	const arrayLiteralNode = enumCallArgs[0];

	if (!Node.isArrayLiteralExpression(arrayLiteralNode)) return;

	const values = arrayLiteralNode
		.getElements()
		.filter(Node.isStringLiteral)
		.map((el) => el.getLiteralValue());

	return values.length > 0 ? values : undefined;
}

/**
 * Collect doclines from all config classes, i.e. descriptions of env vars decorated with `@Env`.
 *
 * @returns
 * ```json
 * {
 *   "N8N_AUTH_COOKIE_SAMESITE": {
 * 		"description": "This sets the `Samesite` flag on n8n auth cookie",
 * 		"defaultValue": "lax",
 * 		"type": "enum",
 * 		"enumValues": ["strict", "lax", "none"],
 * 		"sections": ["auth", "security"]
 * 	}
 * }
 * ```
 */
function collectEnvVarsJson() {
	const doclines: EnvVars = {};

	project.addSourceFilesAtPaths('src/configs/**/*.ts');
	project.addSourceFilesAtPaths('src/index.ts');
	// @TODO: Also search in cli and core

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

				const envVarNameArg = args[0];

				if (!Node.isStringLiteral(envVarNameArg)) continue;

				const envVarName = envVarNameArg.getLiteralValue();

				const jsDocs = classField.getJsDocs();

				if (jsDocs.length === 0) continue;

				const jsDoc = jsDocs[0];
				const description = jsDoc.getDescription().trim();
				let sections: string[] = [];

				const sectionsTag = jsDoc.getTags().find((tag) => tag.getTagName() === 'sections');
				if (sectionsTag) {
					const sectionsText = sectionsTag.getCommentText()?.trim();
					if (sectionsText) {
						sections = sectionsText
							.split(',')
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
					}
				}

				const initializer = classField.getInitializer();

				let defaultValue: string | number | boolean | null = null;

				if (!initializer) continue;

				if (Node.isStringLiteral(initializer) || Node.isNumericLiteral(initializer)) {
					defaultValue = initializer.getLiteralValue();
				} else if (Node.isTrueLiteral(initializer)) {
					defaultValue = true;
				} else if (Node.isFalseLiteral(initializer)) {
					defaultValue = false;
				} else {
					defaultValue = initializer.getText();
				}

				let propertyType = getPropertyType(classField);
				let enumValues: EnvVarEntry['enumValues'];

				if (args.length > 1) {
					const envVarSchemaArg = args[1];
					const extractedEnumValues = toEnumValues(envVarSchemaArg);

					if (!extractedEnumValues) continue;

					propertyType = 'enum';
					enumValues = extractedEnumValues;
				}

				const entry: EnvVarEntry = {
					description,
					defaultValue,
					type: propertyType,
					sections,
				};

				if (enumValues) entry.enumValues = enumValues;

				doclines[envVarName] = entry;
			}
		}
	}

	return doclines;
}

function capitalize(s: string): string {
	if (!s) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function toMarkdownTable(doclines: EnvVars): string {
	let table = '';
	table += '| Variable | Type  | Default  | Description |\n';
	table += '| :------- | :---- | :------- | :---------- |\n';

	const sortedEnvVars = Object.keys(doclines).sort();

	// @TODO: Display enum variants?

	for (const envVarName of sortedEnvVars) {
		const row = doclines[envVarName];
		const varNameMd = `\`${envVarName}\``;
		const typeMd = capitalize(row.type);

		const defaultMd = String(row.defaultValue);

		// make description single-line for table cell
		const descriptionMd = row.description.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, ' ');

		table += `| ${varNameMd} | ${typeMd} | ${defaultMd} | ${descriptionMd} |\n`;
	}

	return table;
}

const json = collectEnvVarsJson();
const markdown = toMarkdownTable(json);

const output = {
	json,
	markdown,
};

const isCI = process.env.CI === 'true';

if (isCI) {
	console.log(JSON.stringify(output, null, 2));
} else {
	const JSON_PATH = path.resolve(__dirname, '../env-vars.json');
	const MARKDOWN_PATH = path.resolve(__dirname, '../env-vars.md');

	fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
	fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2));
	fs.writeFileSync(MARKDOWN_PATH, markdown);

	console.log(json);
	console.info(`Env vars json written to ${JSON_PATH}`);
	console.info(`Env vars markdown written to ${MARKDOWN_PATH}`);
}
