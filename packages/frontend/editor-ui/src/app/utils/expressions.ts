import { i18n } from '@n8n/i18n';
import type { ResolvableState } from '@/app/types/expressions';
import type { Result } from '@n8n/utils/result';
import { ExpressionError, ExpressionParser, isExpression, type IPinData } from 'n8n-workflow';
import { isObject } from '@/app/utils/objectUtils';

export { isExpression };

type ExternalSecretReferenceState = 'none' | 'known' | 'missing' | 'unknown';

const SECRET_REFERENCE = /\$secrets\b/;
/** The only key forms we can read at edit time: `.key`, `['key']`, `["key"]`. */
const LITERAL_KEY_ACCESS =
	/^\s*(?:\.\s*(?<dotKey>[a-zA-Z_$][\w$]*)|\[\s*(?<quote>['"])(?<quotedKey>[^\\]*?)\k<quote>\s*\])/;
/** Any further access, e.g. `[$vars.key]`, `?.key`, `['a\'b']`. */
const UNREAD_ACCESS = /^\s*(?:\?\.|\.|\[)/;

/**
 * Reads the keys directly after a `$secrets` occurrence, so `.vault['key']` yields
 * `['vault', 'key']`. `hasUnreadAccess` flags a chain that goes on in some other form.
 */
const readLiteralKeys = (afterReference: string): { keys: string[]; hasUnreadAccess: boolean } => {
	const keys: string[] = [];
	let rest = afterReference;

	let access = LITERAL_KEY_ACCESS.exec(rest);

	while (access) {
		keys.push(access.groups?.dotKey ?? access.groups?.quotedKey ?? '');
		rest = rest.slice(access[0].length);
		access = LITERAL_KEY_ACCESS.exec(rest);
	}

	return { keys, hasUnreadAccess: UNREAD_ACCESS.test(rest) };
};

/**
 * Walks the keys through the masked secrets metadata: `['vault', 'key']` in
 * `{ vault: { key: '***' } }` is `known`, an absent key is `missing`, anything else `unknown`.
 */
const lookUpKeys = (
	keys: string[],
	secrets: unknown,
): Exclude<ExternalSecretReferenceState, 'none'> => {
	let value: unknown = secrets;

	for (const key of keys) {
		if (!isObject(value)) return 'unknown';
		// Metadata that never loaded is empty, which must not read as a wrong path.
		if (Object.keys(value).length === 0) return 'unknown';
		if (!Object.hasOwn(value, key)) return 'missing';
		value = value[key];
	}

	return typeof value === 'string' ? 'known' : 'unknown';
};

/**
 * Looks up every `$secrets` reference in the expression's code against the secrets metadata,
 * reporting `known` only when each one reads in full and lands on an existing secret.
 */
const getExternalSecretReferenceState = (
	expression: string,
	secrets: unknown,
): ExternalSecretReferenceState => {
	let state: ExternalSecretReferenceState = 'none';

	for (const { type, text: code } of ExpressionParser.splitExpression(expression)) {
		if (type === 'text') continue;

		const [, ...afterReferences] = code.split(SECRET_REFERENCE);

		for (const afterReference of afterReferences) {
			const { keys, hasUnreadAccess } = readLiteralKeys(afterReference);
			const keyState = lookUpKeys(keys, secrets);
			const referenceState = hasUnreadAccess && keyState === 'known' ? 'unknown' : keyState;

			if (referenceState !== 'known') return referenceState;
			state = 'known';
		}
	}

	return state;
};

export const getExternalSecretPreview = (
	expression: string,
	secrets: unknown,
): { text: string; exists: boolean } | undefined => {
	switch (getExternalSecretReferenceState(expression, secrets)) {
		case 'known':
			return { text: i18n.baseText('expressionModalInput.evaluatedDuringExecution'), exists: true };
		case 'missing':
			return { text: i18n.baseText('expressionModalInput.secretNotFound'), exists: false };
		default:
			return undefined;
	}
};

export const isEmptyExpression = (expr: string) => {
	return /\{\{\s*\}\}/.test(expr);
};

export const unwrapExpression = (expr: string) => {
	return expr.replace(/\{\{(.*)\}\}/, '$1').trim();
};

export const removeExpressionPrefix = <T = unknown>(expr: T): T | string => {
	return isExpression(expr) ? expr.slice(1) : (expr ?? '');
};

export const isTestableExpression = (expr: string) => {
	return ExpressionParser.splitExpression(expr).every((c) => {
		if (c.type === 'text') {
			return true;
		}
		return /\$secrets(\.[a-zA-Z0-9_]+)+$/.test(c.text.trim());
	});
};

export const isNoExecDataExpressionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_execution_data';
};

export const isNoNodeExecDataExpressionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_node_execution_data';
};

export const isPairedItemIntermediateNodesError = (error: unknown): error is ExpressionError => {
	return (
		error instanceof ExpressionError && error.context.type === 'paired_item_intermediate_nodes'
	);
};

export const isPairedItemNoConnectionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_no_connection';
};

export const isInvalidPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_invalid_info';
};

export const isNoPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'paired_item_no_info';
};

export const isNoInputConnectionError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.context.type === 'no_input_connection';
};

export const isAnyPairedItemError = (error: unknown): error is ExpressionError => {
	return error instanceof ExpressionError && error.functionality === 'pairedItem';
};

export const getResolvableState = (error: unknown, ignoreError = false): ResolvableState => {
	if (!error) return 'valid';

	if (
		isNoExecDataExpressionError(error) ||
		isNoNodeExecDataExpressionError(error) ||
		isPairedItemIntermediateNodesError(error) ||
		ignoreError
	) {
		return 'pending';
	}

	return 'invalid';
};

export const getExpressionErrorMessage = (
	error: Error,
	pinData: IPinData,
	nodeHasRunData = false,
): string => {
	if (isNoExecDataExpressionError(error) || isPairedItemIntermediateNodesError(error)) {
		return i18n.baseText('expressionModalInput.noExecutionData');
	}

	if (isNoNodeExecDataExpressionError(error)) {
		const nodeCause = error.context.nodeCause as string;
		return i18n.baseText('expressionModalInput.noNodeExecutionData', {
			interpolate: { node: nodeCause },
		});
	}
	if (isNoInputConnectionError(error)) {
		return i18n.baseText('expressionModalInput.noInputConnection');
	}

	if (isPairedItemNoConnectionError(error)) {
		return i18n.baseText('expressionModalInput.pairedItemConnectionError');
	}

	if (isInvalidPairedItemError(error) || isNoPairedItemError(error)) {
		const nodeCause = error.context.nodeCause as string;
		const isPinned = !!pinData[nodeCause];

		if (isPinned) {
			return i18n.baseText('expressionModalInput.pairedItemInvalidPinnedError', {
				interpolate: { node: nodeCause },
			});
		}
	}

	if (isAnyPairedItemError(error)) {
		return nodeHasRunData
			? i18n.baseText('expressionModalInput.pairedItemError')
			: i18n.baseText('expressionModalInput.pairedItemError.noRunData');
	}

	return error.message;
};

export const stringifyExpressionResult = (
	result: Result<unknown, Error>,
	pinData: IPinData,
	nodeHasRunData = false,
): string => {
	if (!result.ok) {
		if (getResolvableState(result.error) !== 'invalid') {
			return '';
		}

		return `[${i18n.baseText('parameterInput.error')}: ${getExpressionErrorMessage(result.error, pinData, nodeHasRunData)}]`;
	}

	if (result.result === null) {
		return '';
	}

	if (typeof result.result === 'string' && result.result.length === 0) {
		return i18n.baseText('parameterInput.emptyString');
	}

	return typeof result.result === 'string' ? result.result : String(result.result);
};

export const completeExpressionSyntax = <T>(value: T, isSpecializedEditor = false) => {
	if (isSpecializedEditor) return value;
	if (typeof value === 'string' && !value.startsWith('=')) {
		if (value.endsWith('{{ ')) return '=' + value + ' }}';
		if (value.endsWith('{{$')) return '=' + value.slice(0, -1) + ' $ }}';
	}

	return value;
};

export const shouldConvertToExpression = (
	value: unknown,
	isSpecializedEditor = false,
): value is string => {
	if (isSpecializedEditor) return false;

	return (
		typeof value === 'string' &&
		!value.startsWith('=') &&
		value.includes('{{') &&
		value.includes('}}')
	);
};
