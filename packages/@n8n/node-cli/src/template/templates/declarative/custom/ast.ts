import { camelCase, capitalCase } from 'change-case';
import { SyntaxKind } from 'ts-morph';

import type { CredentialType } from './types';
import {
	getChildObjectLiteral,
	loadSingleSourceFile,
	updateStringProperty,
} from '../../../../utils/ast';

export function updateNodeAst({
	nodePath,
	className,
	baseUrl,
}: { nodePath: string; className: string; baseUrl: string }) {
	const sourceFile = loadSingleSourceFile(nodePath);
	const classDecl = sourceFile.getClasses()[0];

	classDecl.rename(className);
	const nodeDescriptionObj = classDecl
		.getPropertyOrThrow('description')
		.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

	updateStringProperty({
		obj: nodeDescriptionObj,
		key: 'displayName',
		value: capitalCase(className),
	});
	updateStringProperty({
		obj: nodeDescriptionObj,
		key: 'name',
		value: camelCase(className),
	});
	updateStringProperty({
		obj: nodeDescriptionObj,
		key: 'description',
		value: `Interact with the ${capitalCase(className)} API`,
	});

	const icon = getChildObjectLiteral({ obj: nodeDescriptionObj, key: 'icon' });
	updateStringProperty({
		obj: icon,
		key: 'light',
		value: `file:${camelCase(className)}.svg`,
	});
	updateStringProperty({
		obj: icon,
		key: 'dark',
		value: `file:${camelCase(className)}.dark.svg`,
	});

	const requestDefaults = getChildObjectLiteral({
		obj: nodeDescriptionObj,
		key: 'requestDefaults',
	});

	updateStringProperty({
		obj: requestDefaults,
		key: 'baseURL',
		value: baseUrl,
	});

	const defaults = getChildObjectLiteral({
		obj: nodeDescriptionObj,
		key: 'defaults',
	});

	updateStringProperty({ obj: defaults, key: 'name', value: capitalCase(className) });

	return sourceFile;
}

export function updateCredentialAst({
	nodeName,
	repoName,
	baseUrl,
	credentialPath,
	credentialType,
	credentialClassName,
}: {
	nodeName: string;
	repoName: string;
	credentialType: CredentialType;
	credentialPath: string;
	credentialClassName: string;
	baseUrl: string;
}) {
	const sourceFile = loadSingleSourceFile(credentialPath);
	const classDecl = sourceFile.getClasses()[0];

	classDecl.rename(credentialClassName);

	const credentialDisplayName = `${capitalCase(nodeName)} ${
		credentialType === 'oauth2' ? 'OAuth2 API' : 'API'
	}`;
	updateStringProperty({
		obj: classDecl,
		key: 'displayName',
		value: credentialDisplayName,
	});

	const credentialName = camelCase(
		`${nodeName}${credentialType === 'oauth2' ? 'OAuth2Api' : 'Api'}`,
	);
	updateStringProperty({
		obj: classDecl,
		key: 'name',
		value: credentialName,
	});

	const docUrlProp = classDecl.getProperty('documentationUrl');
	if (docUrlProp) {
		const initializer = docUrlProp.getInitializerIfKindOrThrow(SyntaxKind.StringLiteral);
		const newUrl = initializer.getLiteralText().replace('/repo', `/${repoName}`);
		initializer.setLiteralValue(newUrl);
	}

	const testRequest = classDecl
		.getPropertyOrThrow('test')
		.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression)
		.getPropertyOrThrow('request')
		.asKindOrThrow(SyntaxKind.PropertyAssignment)
		.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

	updateStringProperty({
		obj: testRequest,
		key: 'baseURL',
		value: baseUrl,
	});

	return sourceFile;
}

export function addCredentialToNode({
	nodePath,
	credentialName,
}: { nodePath: string; credentialName: string }) {
	const sourceFile = loadSingleSourceFile(nodePath);
	const classDecl = sourceFile.getClasses()[0];

	const descriptionProp = classDecl
		.getPropertyOrThrow('description')
		.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

	const credentialsProp = descriptionProp.getPropertyOrThrow('credentials');

	if (credentialsProp.getKind() === SyntaxKind.PropertyAssignment) {
		const initializer = credentialsProp.getFirstDescendantByKindOrThrow(
			SyntaxKind.ArrayLiteralExpression,
		);
		initializer.addElement(`{ name: '${credentialName}', required: true }`);
	}

	return sourceFile;
}
