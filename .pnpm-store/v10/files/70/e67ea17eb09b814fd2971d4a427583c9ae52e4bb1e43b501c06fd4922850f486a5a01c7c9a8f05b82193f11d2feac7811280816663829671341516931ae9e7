declare module 'web-tree-sitter' {
  class Parser {
    /**
     *
     * @param moduleOptions Optional emscripten module-object, see https://emscripten.org/docs/api_reference/module.html
     */
    static init(moduleOptions?: object): Promise<void>;
    delete(): void;
    parse(input: string | Parser.Input, oldTree?: Parser.Tree, options?: Parser.Options): Parser.Tree;
    getIncludedRanges(): Parser.Range[];
    getTimeoutMicros(): number;
    setTimeoutMicros(timeout: number): void;
    reset(): void;
    getLanguage(): Parser.Language;
    setLanguage(language?: Parser.Language | null): void;
    getLogger(): Parser.Logger;
    setLogger(logFunc?: Parser.Logger | false | null): void;
  }

  namespace Parser {
    export type Options = {
      includedRanges?: Range[];
    };

    export type Point = {
      row: number;
      column: number;
    };

    export type Range = {
      startIndex: number,
      endIndex: number,
      startPosition: Point,
      endPosition: Point
    };

    export type Edit = {
      startIndex: number;
      oldEndIndex: number;
      newEndIndex: number;
      startPosition: Point;
      oldEndPosition: Point;
      newEndPosition: Point;
    };

    export type Logger = (
      message: string,
      params: { [param: string]: string },
      type: "parse" | "lex"
    ) => void;

    export interface Input {
      (index: number, position?: Point): string | null;
    }

    export interface SyntaxNode {
      tree: Tree;
      id: number;
      typeId: number;
      grammarId: number;
      type: string;
      grammarType: string;
      isNamed: boolean;
      isMissing: boolean;
      isExtra: boolean;
      hasChanges: boolean;
      hasError: boolean;
      isError: boolean;
      text: string;
      parseState: number;
      nextParseState: number;
      startPosition: Point;
      endPosition: Point;
      startIndex: number;
      endIndex: number;
      parent: SyntaxNode | null;
      children: Array<SyntaxNode>;
      namedChildren: Array<SyntaxNode>;
      childCount: number;
      namedChildCount: number;
      firstChild: SyntaxNode | null;
      firstNamedChild: SyntaxNode | null;
      lastChild: SyntaxNode | null;
      lastNamedChild: SyntaxNode | null;
      nextSibling: SyntaxNode | null;
      nextNamedSibling: SyntaxNode | null;
      previousSibling: SyntaxNode | null;
      previousNamedSibling: SyntaxNode | null;
      descendantCount: number;

      equals(other: SyntaxNode): boolean;
      toString(): string;
      child(index: number): SyntaxNode | null;
      namedChild(index: number): SyntaxNode | null;
      childForFieldName(fieldName: string): SyntaxNode | null;
      childForFieldId(fieldId: number): SyntaxNode | null;
      fieldNameForChild(childIndex: number): string | null;
      childrenForFieldName(fieldName: string): Array<SyntaxNode>;
      childrenForFieldId(fieldId: number): Array<SyntaxNode>;
      firstChildForIndex(index: number): SyntaxNode | null;
      firstNamedChildForIndex(index: number): SyntaxNode | null;

      descendantForIndex(index: number): SyntaxNode;
      descendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
      namedDescendantForIndex(index: number): SyntaxNode;
      namedDescendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
      descendantForPosition(position: Point): SyntaxNode;
      descendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
      namedDescendantForPosition(position: Point): SyntaxNode;
      namedDescendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
      descendantsOfType(types: String | Array<String>, startPosition?: Point, endPosition?: Point): Array<SyntaxNode>;

      walk(): TreeCursor;
    }

    export interface TreeCursor {
      nodeType: string;
      nodeTypeId: number;
      nodeStateId: number;
      nodeText: string;
      nodeId: number;
      nodeIsNamed: boolean;
      nodeIsMissing: boolean;
      startPosition: Point;
      endPosition: Point;
      startIndex: number;
      endIndex: number;
      readonly currentNode: SyntaxNode;
      readonly currentFieldName: string;
      readonly currentFieldId: number;
      readonly currentDepth: number;
      readonly currentDescendantIndex: number;

      reset(node: SyntaxNode): void;
      resetTo(cursor: TreeCursor): void;
      delete(): void;
      gotoParent(): boolean;
      gotoFirstChild(): boolean;
      gotoLastChild(): boolean;
      gotoFirstChildForIndex(goalIndex: number): boolean;
      gotoFirstChildForPosition(goalPosition: Point): boolean;
      gotoNextSibling(): boolean;
      gotoPreviousSibling(): boolean;
      gotoDescendant(goalDescendantIndex: number): void;
    }

    export interface Tree {
      readonly rootNode: SyntaxNode;

      rootNodeWithOffset(offsetBytes: number, offsetExtent: Point): SyntaxNode;
      copy(): Tree;
      delete(): void;
      edit(edit: Edit): void;
      walk(): TreeCursor;
      getChangedRanges(other: Tree): Range[];
      getIncludedRanges(): Range[];
      getLanguage(): Language;
    }

    export interface QueryCapture {
      name: string;
      text?: string;
      node: SyntaxNode;
      setProperties?: { [prop: string]: string | null };
      assertedProperties?: { [prop: string]: string | null };
      refutedProperties?: { [prop: string]: string | null };
    }

    export interface QueryMatch {
      pattern: number;
      captures: QueryCapture[];
    }

    export type QueryOptions = {
      startPosition?: Point;
      endPosition?: Point;
      startIndex?: number;
      endIndex?: number;
      matchLimit?: number;
      maxStartDepth?: number;
      timeoutMicros?: number;
    };

    export interface PredicateResult {
      operator: string;
      operands: { name: string; type: string }[];
    }

    export class Query {
      captureNames: string[];
      readonly predicates: { [name: string]: Function }[];
      readonly setProperties: any[];
      readonly assertedProperties: any[];
      readonly refutedProperties: any[];
      readonly matchLimit: number;

      delete(): void;
      captures(node: SyntaxNode, options?: QueryOptions): QueryCapture[];
      matches(node: SyntaxNode, options?: QueryOptions): QueryMatch[];
      predicatesForPattern(patternIndex: number): PredicateResult[];
      disableCapture(captureName: string): void;
      disablePattern(patternIndex: number): void;
      isPatternGuaranteedAtStep(byteOffset: number): boolean;
      isPatternRooted(patternIndex: number): boolean;
      isPatternNonLocal(patternIndex: number): boolean;
      startIndexForPattern(patternIndex: number): number;
      didExceedMatchLimit(): boolean;
    }

    class Language {
      static load(input: string | Uint8Array): Promise<Language>;

      readonly version: number;
      readonly fieldCount: number;
      readonly stateCount: number;
      readonly nodeTypeCount: number;

      fieldNameForId(fieldId: number): string | null;
      fieldIdForName(fieldName: string): number | null;
      idForNodeType(type: string, named: boolean): number;
      nodeTypeForId(typeId: number): string | null;
      nodeTypeIsNamed(typeId: number): boolean;
      nodeTypeIsVisible(typeId: number): boolean;
      nextState(stateId: number, typeId: number): number;
      query(source: string): Query;
      lookaheadIterator(stateId: number): LookaheadIterable | null;
    }

    export class LookaheadIterable {
      readonly language: Language;
      readonly currentTypeId: number;
      readonly currentType: string;

      delete(): void;
      reset(language: Language, stateId: number): boolean;
      resetState(stateId: number): boolean;
      [Symbol.iterator](): Iterator<string>;
    }
  }

  export = Parser
}
