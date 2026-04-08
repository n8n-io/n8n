import {
	Project,
	SyntaxKind,
	type ClassDeclaration,
	type ObjectLiteralExpression,
	type PropertyAssignment,
	type PropertyDeclaration,
} from 'ts-morph';

export const loadSingleSourceFile = (path: string) => {
	const project = new Project({
		skipFileDependencyResolution: true,
	});

	return project.addSourceFileAtPath(path);
};

const setStringInitializer = (prop: PropertyAssignment | PropertyDeclaration, value: string) => {
	prop.getInitializerIfKindOrThrow(SyntaxKind.StringLiteral).setLiteralValue(value);
};

export const updateStringProperty = ({
	obj,
	key,
	value,
}: { obj: ObjectLiteralExpression | ClassDeclaration; key: string; value: string }) => {
	const prop = obj.getPropertyOrThrow(key);

	if (prop.isKind(SyntaxKind.PropertyAssignment)) {
		setStringInitializer(prop.asKindOrThrow(SyntaxKind.PropertyAssignment), value);
	} else if (prop.isKind(SyntaxKind.PropertyDeclaration)) {
		setStringInitializer(prop.asKindOrThrow(SyntaxKind.PropertyDeclaration), value);
	}
};

export const getChildObjectLiteral = ({
	obj,
	key,
}: { obj: ObjectLiteralExpression; key: string }) => {
	return obj
		.getPropertyOrThrow(key)
		.asKindOrThrow(SyntaxKind.PropertyAssignment)
		.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
};
