import { Tree, Parser, NodeType } from '@lezer/common';

declare function defaultIgnore(type: NodeType): boolean;
declare function testTree(tree: Tree, expect: string, mayIgnore?: typeof defaultIgnore): void;
declare function fileTests(file: string, fileName: string, mayIgnore?: typeof defaultIgnore): {
    name: string;
    text: string;
    expected: string;
    configStr: string;
    config: object;
    strict: boolean;
    run(parser: Parser): void;
}[];

export { fileTests, testTree };
