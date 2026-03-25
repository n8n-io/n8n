export type { types as astTypes } from 'recast';
export { visit as astVisit } from 'recast';
export { builders as astBuilders, type namedTypes as astNamedTypes } from 'ast-types';
import type { types } from 'recast';
import type { namedTypes } from 'ast-types';
export interface TournamentHooks {
    before: ASTBeforeHook[];
    after: ASTAfterHook[];
}
export type ASTAfterHook = (ast: namedTypes.ExpressionStatement, dataNode: namedTypes.ThisExpression | namedTypes.Identifier) => void;
export type ASTBeforeHook = (ast: types.namedTypes.File, dataNode: namedTypes.ThisExpression | namedTypes.Identifier) => void;
