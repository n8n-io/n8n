import { Project, SyntaxKind } from 'ts-morph';

import { updateStringProperty, getChildObjectLiteral } from './ast';

describe('TS Morph AST utils', () => {
	const createSourceFile = (content: string) => {
		const project = new Project();
		return project.createSourceFile('test.ts', content);
	};

	describe('updateStringProperty', () => {
		it('should update object literal property', () => {
			const content = 'export const config = { name: "oldName", version: "1.0.0" };';
			const sourceFile = createSourceFile(content);
			const configVar = sourceFile.getVariableDeclarationOrThrow('config');
			const configObj = configVar.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

			updateStringProperty({ obj: configObj, key: 'name', value: 'newName' });

			expect(sourceFile.getFullText()).toContain('name: "newName"');
			expect(sourceFile.getFullText()).not.toContain('name: "oldName"');
		});

		it('should update class property', () => {
			const content = 'export class Config { name = "oldName"; version = "1.0.0"; }';
			const sourceFile = createSourceFile(content);
			const classDecl = sourceFile.getClassOrThrow('Config');

			updateStringProperty({ obj: classDecl, key: 'name', value: 'newName' });

			expect(sourceFile.getFullText()).toContain('name = "newName"');
		});

		it('should throw for non-string property', () => {
			const content = 'export const config = { name: "test", count: 42 };';
			const sourceFile = createSourceFile(content);
			const configVar = sourceFile.getVariableDeclarationOrThrow('config');
			const configObj = configVar.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

			expect(() => updateStringProperty({ obj: configObj, key: 'count', value: 'new' })).toThrow();
		});
	});

	describe('getChildObjectLiteral', () => {
		it('should return nested object', () => {
			const content = `
export const config = {
    database: { host: "localhost", port: "5432" },
    cache: { ttl: "3600" }
};`;
			const sourceFile = createSourceFile(content);
			const configVar = sourceFile.getVariableDeclarationOrThrow('config');
			const configObj = configVar.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

			const dbObj = getChildObjectLiteral({ obj: configObj, key: 'database' });

			expect(dbObj.getProperty('host')).toBeDefined();
			expect(dbObj.getProperty('port')).toBeDefined();
		});

		it('should throw for non-object property', () => {
			const content = 'export const config = { name: "test", count: 42 };';
			const sourceFile = createSourceFile(content);
			const configVar = sourceFile.getVariableDeclarationOrThrow('config');
			const configObj = configVar.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

			expect(() => getChildObjectLiteral({ obj: configObj, key: 'name' })).toThrow();
		});
	});
});
