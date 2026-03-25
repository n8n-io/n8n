declare namespace dependencyTree {
  interface TreeInnerNode {
    [parent: string]: TreeInnerNode | string;
  }
  type Tree = TreeInnerNode | string;

  export interface Options {
    filename: string;
    directory: string;
    visited?: Tree;
    nonExistent?: string[];
    isListForm?: boolean;
    requireConfig?: string;
    webpackConfig?: string;
    nodeModulesConfig?: any;
    detectiveConfig?: any;
    tsConfig?: string | Record<string, any>;
    noTypeDefinitions?: boolean;
    filter?: (path: string) => boolean;
  }

  interface Config extends Options {
    clone: () => Config;
  }

  function toList(options: Options): string[];
  function _getDependencies(config: Config): string[];
}

declare function dependencyTree(
  options: dependencyTree.Options
): dependencyTree.Tree;

export = dependencyTree;
