import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

/**
 * Minimal type for a Vue template attribute node from vue-eslint-parser.
 */
export interface VueAttribute {
	directive: boolean;
	key: { name: string; rawName: string };
	value?: { value: string } | null;
}

/**
 * Parser services provided by vue-eslint-parser.
 * Used by custom rules that need to visit Vue template AST nodes.
 */
export interface VueParserServices {
	defineTemplateBodyVisitor: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		templateVisitor: Record<string, (node: any) => void>,
		scriptVisitor?: RuleListener,
	) => RuleListener;
}
