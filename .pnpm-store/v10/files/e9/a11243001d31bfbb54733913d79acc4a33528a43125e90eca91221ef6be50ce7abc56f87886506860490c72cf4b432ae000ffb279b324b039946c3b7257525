# ts-morph

[![npm version](https://badge.fury.io/js/ts-morph.svg)](https://badge.fury.io/js/ts-morph)
[![CI](https://github.com/dsherret/ts-morph/workflows/CI/badge.svg)](https://github.com/dsherret/ts-morph/actions?query=workflow%3ACI)
[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

[TypeScript](https://github.com/Microsoft/TypeScript) Compiler API wrapper. Provides an easier way to programmatically navigate and manipulate TypeScript and JavaScript code.

Formerly `ts-simple-ast`.

## Overview

- [Documentation](https://ts-morph.com/)
- [Declaration file](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/lib/ts-morph.d.ts)

## Main Features

1. Wraps the compiler API objects to provide helper methods for getting information and programmatically changing files.
2. Allows falling back to the compiler API objects if necessary (ex. `classDeclaration.compilerNode` or `typeChecker.compilerObject`).
3. All changes are kept in memory (including file and directory moves) until specifying to save to the underlying file system.
4. Changes are made to the text and wrapped nodes can be held on to between manipulations.

## Getting Started

1. [Installing](https://ts-morph.com/)
2. [Instantiating](https://ts-morph.com/setup/)
3. [Adding source files](https://ts-morph.com/setup/adding-source-files)
4. [Getting source files](https://ts-morph.com/navigation/getting-source-files)
5. [Navigating](https://ts-morph.com/navigation/example)
6. [Manipulating](https://ts-morph.com/manipulation/)

## Library Progress

This library is still under active development. Most common code manipulation/generation use cases are implemented, but there's still a lot of work to do. Please open an issue if you find a feature missing, bug, or question that isn't in the issue tracker.

- [Breaking changes](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/breaking-changes.md)
- [Change log](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/CHANGELOG.md)
- [Wrapped nodes progress report](https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/wrapped-nodes.md)

## Example

<!-- dprint-ignore -->
```ts
import { Project, StructureKind } from "ts-morph";

// initialize
const project = new Project({
    // Optionally specify compiler options, tsconfig.json, in-memory file system, and more here.
    // If you initialize with a tsconfig.json, then it will automatically populate the project
    // with the associated source files.
    // Read more: https://ts-morph.com/setup/
});

// add source files
project.addSourceFilesAtPaths("src/**/*.ts");
const myClassFile = project.createSourceFile("src/MyClass.ts", "export class MyClass {}");
const myEnumFile = project.createSourceFile("src/MyEnum.ts", {
    statements: [{
        kind: StructureKind.Enum,
        name: "MyEnum",
        isExported: true,
        members: [{ name: "member" }],
    }],
});

// get information
const myClass = myClassFile.getClassOrThrow("MyClass");
myClass.getName();          // returns: "MyClass"
myClass.hasExportKeyword(); // returns: true
myClass.isDefaultExport();  // returns: false

// manipulate
const myInterface = myClassFile.addInterface({
    name: "IMyInterface",
    isExported: true,
    properties: [{
        name: "myProp",
        type: "number",
    }],
});

myClass.rename("NewName");
myClass.addImplements(myInterface.getName());
myClass.addProperty({
    name: "myProp",
    initializer: "5",
});

project.getSourceFileOrThrow("src/ExistingFile.ts").delete();

// asynchronously save all the changes above
await project.save();

// get underlying compiler node from the typescript AST from any node
const compilerNode = myClassFile.compilerNode;
```

Or navigate existing compiler nodes created with the TypeScript compiler (the `ts` named export is the TypeScript compiler):

```ts ignore-error: 1109
import { createWrappedNode, ClassDeclaration, ts } from "ts-morph";

// some code that creates a class declaration using the ts object
const classNode: ts.ClassDeclaration = ...;

// create and use a wrapped node
const classDec = createWrappedNode(classNode) as ClassDeclaration;
const firstProperty = classDec.getProperties()[0];

// ... do more stuff here ...
```
