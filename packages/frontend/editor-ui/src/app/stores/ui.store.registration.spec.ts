import { describe, it, expect } from 'vitest';
import ts from 'typescript';

import modalsVueContent from '../components/Modals.vue?raw';
// eslint-disable-next-line import-x/extensions
import uiStoreContent from './ui.store.ts?raw';

const MODAL_KEY_REGEX = /^[A-Z_][A-Z_0-9]+$/;
const MODAL_ROOT_NAME_ATTR_REGEX = /<ModalRoot\s+:name\s*=\s*(['"])([A-Z_][A-Z_0-9]+)\1/g;

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort();
}

/**
 * Extract all modal keys used in <ModalRoot :name="..."> from Modals.vue.
 * This intentionally only supports constant-like modal keys (ALL_CAPS_WITH_UNDERSCORES).
 */
function extractModalKeysFromModalsVue(content: string): string[] {
	const keys: string[] = [];
	let match: RegExpExecArray | null;

	while ((match = MODAL_ROOT_NAME_ATTR_REGEX.exec(content)) !== null) {
		keys.push(match[2]);
	}

	if (keys.length === 0) {
		throw new Error(
			'No modal keys were extracted from Modals.vue. ' +
				'The <ModalRoot :name="..."> pattern may have changed, or modal keys are no longer constant-like.',
		);
	}

	return uniqueSorted(keys);
}

/**
 * Extract modal keys registered in modalsById from ui.store.ts (AST-based).
 *
 * It looks inside the object literal passed to ref(...) for:
 * 1) Computed keys: { [DELETE_USER_MODAL_KEY]: { ... } }
 * 2) Identifiers / strings inside array literals found in spread assignments
 *    (e.g. ...something([ABOUT_MODAL_KEY, ...])).
 *
 * This avoids relying on specific helpers like Object.fromEntries().
 */
function extractRegisteredModalKeys(content: string): string[] {
	const sourceFile = ts.createSourceFile('ui.store.ts', content, ts.ScriptTarget.Latest, true);
	const registered = new Set<string>();

	const addIfModalLike = (value: string) => {
		if (MODAL_KEY_REGEX.test(value)) registered.add(value);
	};

	const addFromArrayElement = (el: ts.Expression) => {
		if (ts.isIdentifier(el)) addIfModalLike(el.text);
		if (ts.isStringLiteral(el)) addIfModalLike(el.text);
		if (ts.isAsExpression(el) && ts.isIdentifier(el.expression)) {
			addIfModalLike(el.expression.text);
		}
	};

	const collectFromArrayLiteralsInSubtree = (node: ts.Node) => {
		const walk = (n: ts.Node) => {
			if (ts.isArrayLiteralExpression(n)) {
				for (const el of n.elements) addFromArrayElement(el);
			}
			ts.forEachChild(n, walk);
		};
		walk(node);
	};

	const findModalsByIdInitializer = (): ts.Expression | undefined => {
		let found: ts.Expression | undefined;

		const visit = (node: ts.Node) => {
			if (
				ts.isVariableDeclaration(node) &&
				ts.isIdentifier(node.name) &&
				node.name.text === 'modalsById' &&
				node.initializer
			) {
				found = node.initializer;
				return;
			}
			ts.forEachChild(node, visit);
		};

		visit(sourceFile);
		return found;
	};

	const findObjectLiteralPassedToRef = (
		expr: ts.Expression,
	): ts.ObjectLiteralExpression | undefined => {
		if (!ts.isCallExpression(expr)) return undefined;
		const arg0 = expr.arguments[0];
		return arg0 && ts.isObjectLiteralExpression(arg0) ? arg0 : undefined;
	};

	const init = findModalsByIdInitializer();
	if (!init) throw new Error('Could not find modalsById declaration in ui.store.ts');

	const obj = findObjectLiteralPassedToRef(init);
	if (!obj) {
		throw new Error(
			'Could not find an object literal passed to ref(...) for modalsById in ui.store.ts',
		);
	}

	for (const prop of obj.properties) {
		// { [SOME_MODAL_KEY]: {...} }
		if (ts.isPropertyAssignment(prop) && ts.isComputedPropertyName(prop.name)) {
			const keyExpr = prop.name.expression;
			if (ts.isIdentifier(keyExpr)) addIfModalLike(keyExpr.text);
			if (ts.isStringLiteral(keyExpr)) addIfModalLike(keyExpr.text);
		}

		// { ...somethingThatContains([A, B, C]) }
		if (ts.isSpreadAssignment(prop)) {
			collectFromArrayLiteralsInSubtree(prop.expression);
		}
	}

	if (registered.size === 0) {
		throw new Error(
			'Extracted 0 modal keys from modalsById initializer (AST). The store structure likely changed.',
		);
	}

	return [...registered].sort();
}

describe('UI Store - Modal Registration', () => {
	it('should have all modal keys used in Modals.vue registered in ui.store.ts', () => {
		const usedModalKeys = extractModalKeysFromModalsVue(modalsVueContent);
		const registeredModalKeys = extractRegisteredModalKeys(uiStoreContent);

		expect(usedModalKeys.length).toBeGreaterThan(0);
		expect(registeredModalKeys.length).toBeGreaterThan(0);

		const missingKeys = usedModalKeys.filter((key) => !registeredModalKeys.includes(key));

		expect(
			missingKeys,
			missingKeys.length
				? `\n\n❌ Modal registration check failed.\n\nMissing in ui.store.ts (modalsById):\n${missingKeys.map((k) => `  • ${k}`).join('\n')}\n`
				: undefined,
		).toEqual([]);
	});

	it('should warn about unused modal keys registered in ui.store.ts', () => {
		const usedModalKeys = extractModalKeysFromModalsVue(modalsVueContent);
		const registeredModalKeys = extractRegisteredModalKeys(uiStoreContent);

		const unusedKeys = registeredModalKeys.filter((key) => !usedModalKeys.includes(key));

		if (unusedKeys.length) {
			// eslint-disable-next-line no-console
			console.warn(
				`\n⚠️  Unused modal key(s) registered in ui.store.ts but not used in Modals.vue:\n${unusedKeys
					.map((k) => `  • ${k}`)
					.join('\n')}\n`,
			);
		}
	});
});
