<div align='center'>

<h1>TypeBox</h1>

<p>JSON Schema Type Builder with Static Type Resolution for TypeScript</p>
	
<img src="https://github.com/sinclairzx81/typebox/blob/master/typebox.png?raw=true" />

<br />
<br />

[![npm version](https://badge.fury.io/js/%40sinclair%2Ftypebox.svg)](https://badge.fury.io/js/%40sinclair%2Ftypebox)
[![Downloads](https://img.shields.io/npm/dm/%40sinclair%2Ftypebox.svg)](https://www.npmjs.com/package/%40sinclair%2Ftypebox)
[![GitHub CI](https://github.com/sinclairzx81/typebox/workflows/GitHub%20CI/badge.svg)](https://github.com/sinclairzx81/typebox/actions)

</div>

<a name="Install"></a>

## Install

#### Npm
```bash
$ npm install @sinclair/typebox --save
```

#### Deno
```typescript
import { Static, Type } from 'npm:@sinclair/typebox'
```

#### Esm

```typescript
import { Static, Type } from 'https://esm.sh/@sinclair/typebox'
```

## Example

```typescript
import { Static, Type } from '@sinclair/typebox'

const T = Type.Object({                              // const T = {
  x: Type.Number(),                                  //   type: 'object',
  y: Type.Number(),                                  //   required: ['x', 'y', 'z'],
  z: Type.Number()                                   //   properties: {
})                                                   //     x: { type: 'number' },
                                                     //     y: { type: 'number' },
                                                     //     z: { type: 'number' }
                                                     //   }
                                                     // }

type T = Static<typeof T>                            // type T = {
                                                     //   x: number,
                                                     //   y: number,
                                                     //   z: number
                                                     // }
```


<a name="Overview"></a>

## Overview

TypeBox is a runtime type builder that creates in-memory JSON Schema objects that can be statically inferred as TypeScript types. The schemas produced by this library are designed to match the static type assertion rules of the TypeScript compiler. TypeBox enables one to create a unified type that can be statically checked by TypeScript and runtime asserted using standard JSON Schema validation.

This library is designed to enable JSON schema to compose with the same flexibility as TypeScript's type system. It can be used as a simple tool to build up complex schemas or integrated into REST or RPC services to help validate data received over the wire. 

License MIT

## Contents
- [Install](#install)
- [Overview](#overview)
- [Usage](#usage)
- [Types](#types)
  - [Standard](#types-standard)
  - [Extended](#types-extended)
  - [Modifiers](#types-modifiers)
  - [Options](#types-options)
  - [Generics](#types-generics)
  - [References](#types-references)
  - [Recursive](#types-recursive)
  - [Conditional](#types-conditional)
  - [Template Literal](#types-template-literal)
  - [Guards](#types-guards)
  - [Unsafe](#types-unsafe)
  - [Strict](#types-strict)
- [Values](#values)
  - [Create](#values-create)
  - [Clone](#values-clone)
  - [Check](#values-check)
  - [Convert](#values-convert)
  - [Cast](#values-cast)
  - [Equal](#values-equal)
  - [Hash](#values-hash)
  - [Diff](#values-diff)
  - [Patch](#values-patch)
  - [Errors](#values-errors)
  - [Mutate](#values-mutate)
  - [Pointer](#values-pointer)
- [TypeCheck](#typecheck)
  - [Ajv](#typecheck-ajv)
  - [TypeCompiler](#typecheck-typecompiler)
- [TypeSystem](#typesystem)
  - [Types](#typesystem-types)
  - [Formats](#typesystem-formats)
  - [Policies](#typesystem-policies)
- [Benchmark](#benchmark)
  - [Compile](#benchmark-compile)
  - [Validate](#benchmark-validate)
  - [Compression](#benchmark-compression)
- [Contribute](#contribute)

<a name="usage"></a>

## Usage

The following shows general usage.

```typescript
import { Static, Type } from '@sinclair/typebox'

//--------------------------------------------------------------------------------------------
//
// Let's say you have the following type ...
//
//--------------------------------------------------------------------------------------------

type T = {
  id: string,
  name: string,
  timestamp: number
}

//--------------------------------------------------------------------------------------------
//
// ... you can express this type in the following way.
//
//--------------------------------------------------------------------------------------------

const T = Type.Object({                              // const T = {
  id: Type.String(),                                 //   type: 'object',
  name: Type.String(),                               //   properties: { 
  timestamp: Type.Integer()                          //     id: { 
})                                                   //       type: 'string' 
                                                     //     },
                                                     //     name: { 
                                                     //       type: 'string' 
                                                     //     },
                                                     //     timestamp: { 
                                                     //       type: 'integer' 
                                                     //     }
                                                     //   }, 
                                                     //   required: [
                                                     //     'id',
                                                     //     'name',
                                                     //     'timestamp'
                                                     //   ]
                                                     // } 

//--------------------------------------------------------------------------------------------
//
// ... then infer back to the original static type this way.
//
//--------------------------------------------------------------------------------------------

type T = Static<typeof T>                            // type T = {
                                                     //   id: string,
                                                     //   name: string,
                                                     //   timestamp: number
                                                     // }

//--------------------------------------------------------------------------------------------
//
// ... then use the type both as JSON schema and as a TypeScript type.
//
//--------------------------------------------------------------------------------------------

import { Value } from '@sinclair/typebox/value'

function receive(value: T) {                         // ... as a Static Type

  if(Value.Check(T, value)) {                        // ... as a JSON Schema
  
    // ok...
  }
}
```

<a name='types'></a>

## Types

TypeBox types are JSON schema fragments that can be composed into more complex types. Each fragment is structured such that a JSON schema compliant validator can runtime assert a value the same way TypeScript will statically assert a type. TypeBox provides a set of Standard types which are used create JSON schema compliant schematics as well as an Extended type set used to create schematics for constructs native to JavaScript. 

<a name='types-standard'></a>

### Standard Types

The following table lists the Standard TypeBox types. These types are fully compatible with the JSON Schema Draft 6 specification.

```typescript
┌────────────────────────────────┬─────────────────────────────┬────────────────────────────────┐
│ TypeBox                        │ TypeScript                  │ JSON Schema                    │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Any()           │ type T = any                │ const T = { }                  │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Unknown()       │ type T = unknown            │ const T = { }                  │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.String()        │ type T = string             │ const T = {                    │
│                                │                             │   type: 'string'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Number()        │ type T = number             │ const T = {                    │
│                                │                             │   type: 'number'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Integer()       │ type T = number             │ const T = {                    │
│                                │                             │   type: 'integer'              │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Boolean()       │ type T = boolean            │ const T = {                    │
│                                │                             │   type: 'boolean'              │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Null()          │ type T = null               │ const T = {                    │
│                                │                             │   type: 'null'                 │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Literal(42)     │ type T = 42                 │ const T = {                    │
│                                │                             │   const: 42,                   │
│                                │                             │   type: 'number'               │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Array(          │ type T = number[]           │ const T = {                    │
│   Type.Number()                │                             │   type: 'array',               │
│ )                              │                             │   items: {                     │
│                                │                             │     type: 'number'             │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const T = {                    │
│   x: Type.Number(),            │   x: number,                │   type: 'object',              │
│   y: Type.Number()             │   y: number                 │   required: ['x', 'y'],        │
│ })                             │ }                           │   properties: {                │
│                                │                             │     x: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }, {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Tuple([         │ type T = [number, number]   │ const T = {                    │
│   Type.Number(),               │                             │   type: 'array',               │
│   Type.Number()                │                             │   items: [{                    │
│ ])                             │                             │      type: 'number'            │
│                                │                             │   }, {                         │
│                                │                             │     type: 'number'             │
│                                │                             │   }],                          │
│                                │                             │   additionalItems: false,      │
│                                │                             │   minItems: 2,                 │
│                                │                             │   maxItems: 2                  │
│                                │                             │ }                              │
│                                │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ enum Foo {                     │ enum Foo {                  │ const T = {                    │
│   A,                           │   A,                        │   anyOf: [{                    │
│   B                            │   B                         │     type: 'number',            │
│ }                              │ }                           │     const: 0                   │
│                                │                             │   }, {                         │
│ const T = Type.Enum(Foo)       │ type T = Foo                │     type: 'number',            │
│                                │                             │     const: 1                   │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.KeyOf(          │ type T = keyof {            │ const T = {                    │
│   Type.Object({                │   x: number,                │   anyOf: [{                    │
│     x: Type.Number(),          │   y: number                 │     type: 'string',            │
│     y: Type.Number()           │ }                           │     const: 'x'                 │
│   })                           │                             │   }, {                         │
│ )                              │                             │     type: 'string',            │
│                                │                             │     const: 'y'                 │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Union([         │ type T = string | number    │ const T = {                    │
│   Type.String(),               │                             │   anyOf: [{                    │
│   Type.Number()                │                             │      type: 'string'            │
│ ])                             │                             │   }, {                         │
│                                │                             │      type: 'number'            │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Intersect([     │ type T = {                  │ const T = {                    │
│   Type.Object({                │   x: number                 │   allOf: [{                    │
│     x: Type.Number()           │ } & {                       │     type: 'object',            │
│   }),                          │   y: number                 │     required: ['x'],           │
│   Type.Object({                │ }                           │     properties: {              │
│     y: Type.Number()           │                             │       x: {                     │
│   ])                           │                             │         type: 'number'         │
│ ])                             │                             │       }                        │
│                                │                             │     }                          │
│                                │                             │   }, {                         │
│                                │                             │     type: 'object',            |
│                                │                             │     required: ['y'],           │
│                                │                             │     properties: {              │
│                                │                             │       y: {                     │
│                                │                             │         type: 'number'         │
│                                │                             │       }                        │
│                                │                             │     }                          │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Composite([     │ type I = {                  │ const T = {                    │
│   Type.Object({                │   x: number                 │   type: 'object',              │
│     x: Type.Number()           │ } & {                       │   required: ['x', 'y'],        │
│   }),                          │   y: number                 │   properties: {                │
│   Type.Object({                │ }                           │     x: {                       │
│     y: Type.Number()           │                             │       type: 'number'           │
│   })                           │ type T = {                  │     },                         │
│ ])                             │   [K in keyof I]: I[K]      │     y: {                       │
│                                │ }                           │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Never()         │ type T = never              │ const T = {                    │
│                                │                             │   not: {}                      │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Not(            | type T = string             │ const T = {                    │
|   Type.Union([                 │                             │   allOf: [{                    │
│     Type.Literal('x'),         │                             │     not: {                     │
│     Type.Literal('y'),         │                             │       anyOf: [                 │
│     Type.Literal('z')          │                             │         { const: 'x' },        │
│   ]),                          │                             │         { const: 'y' },        │
│   Type.String()                │                             │         { const: 'z' }         │
│ )                              │                             │       ]                        │
│                                │                             │     }                          │
│                                │                             │   }, {                         │
│                                │                             │     type: 'string'             │
│                                │                             │   }]                           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Extends(        │ type T =                    │ const T = {                    │
│   Type.String(),               │  string extends number      │   const: false,                │
│   Type.Number(),               │  true : false               │   type: 'boolean'              │
│   Type.Literal(true),          │                             │ }                              │
│   Type.Literal(false)          │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Extract(        │ type T = Extract<           │ const T = {                    │
│   Type.Union([                 │   string | number,          │   type: 'string'               │
│     Type.String(),             │   string                    │ }                              │
│     Type.Number(),             │ >                           │                                │
│   ]),                          │                             │                                │
│   Type.String()                │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Exclude(        │ type T = Exclude<           │ const T = {                    │
│   Type.Union([                 │   string | number,          │   type: 'number'               │
│     Type.String(),             │   string                    │ }                              │
│     Type.Number(),             │ >                           │                                │
│   ]),                          │                             │                                │
│   Type.String()                │                             │                                │
│ )                              │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const U = Type.Union([         │ type U = 'open' | 'close'   │ const T = {                    │
│   Type.Literal('open'),        │                             │   type: 'string',              │
│   Type.Literal('close')        │ type T = `on${U}`           │   pattern: '^on(open|close)$'  │
│ ])                             │                             │ }                              │
│                                │                             │                                │
│ const T = Type                 │                             │                                │
│   .TemplateLiteral([           │                             │                                │
│      Type.Literal('on'),       │                             │                                │
│      U                         │                             │                                │
│   ])                           │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Record(         │ type T = Record<            │ const T = {                    │
│   Type.String(),               │   string,                   │   type: 'object',              │
│   Type.Number()                │   number                    │   patternProperties: {         │
│ )                              │ >                           │     '^.*$': {                  │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Partial(        │ type T = Partial<{          │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   properties: {                │
│     y: Type.Number()           | }>                          │     x: {                       │
│   })                           │                             │       type: 'number'           │
│ )                              │                             │     },                         │
│                                │                             │     y: {                       │
│                                │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Required(       │ type T = Required<{         │ const T = {                    │
│   Type.Object({                │   x?: number,               │   type: 'object',              │
│     x: Type.Optional(          │   y?: number                │   required: ['x', 'y'],        │
│       Type.Number()            | }>                          │   properties: {                │
│     ),                         │                             │     x: {                       │
│     y: Type.Optional(          │                             │       type: 'number'           │
│       Type.Number()            │                             │     },                         │
│     )                          │                             │     y: {                       │
│   })                           │                             │       type: 'number'           │
│ )                              │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Pick(           │ type T = Pick<{             │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   required: ['x'],             │
│     y: Type.Number()           │ }, 'x'>                     │   properties: {                │
│   }), ['x']                    |                             │     x: {                       │
│ )                              │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Omit(           │ type T = Omit<{             │ const T = {                    │
│   Type.Object({                │   x: number,                │   type: 'object',              │
│     x: Type.Number(),          │   y: number                 │   required: ['y'],             │
│     y: Type.Number()           │ }, 'x'>                     │   properties: {                │
│   }), ['x']                    |                             │     y: {                       │
│ )                              │                             │       type: 'number'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const R = {                    │
│    x: Type.Number(),           │   x: number,                │   $ref: 'T'                    │
│    y: Type.Number()            │   y: number                 │ }                              │
│ }, { $id: 'T' })               | }                           │                                │
│                                │                             │                                │
│ const R = Type.Ref(T)          │ type R = T                  │                                │
│                                │                             │                                │
│                                │                             │                                │
│                                │                             │                                │
│                                │                             │                                │
└────────────────────────────────┴─────────────────────────────┴────────────────────────────────┘
```

<a name='types-extended'></a>

### Extended Types

TypeBox provides several extended types that can be used to produce schematics for common JavaScript constructs. These types can not be used with standard JSON schema validators; but are useful to help frame schematics for RPC interfaces that may receive JSON validated data. Extended types are prefixed with the `[Extended]` doc comment for convenience. The following table lists the supported types.

```typescript
┌────────────────────────────────┬─────────────────────────────┬────────────────────────────────┐
│ TypeBox                        │ TypeScript                  │ Extended Schema                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Constructor([   │ type T = new (              │ const T = {                    │
│   Type.String(),               │  arg0: string,              │   type: 'object',              │
│   Type.Number()                │  arg1: number               │   instanceOf: 'Constructor',   │
│ ], Type.Boolean())             │ ) => boolean                │   parameters: [{               │
│                                │                             │     type: 'string'             │
│                                │                             │   }, {                         │
│                                │                             │     type: 'number'             │
│                                │                             │   }],                          │
│                                │                             │   return: {                    │
│                                │                             │     type: 'boolean'            │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Function([      │ type T = (                  │ const T = {                    │
|   Type.String(),               │  arg0: string,              │   type : 'object',             │
│   Type.Number()                │  arg1: number               │   instanceOf: 'Function',      │
│ ], Type.Boolean())             │ ) => boolean                │   parameters: [{               │
│                                │                             │     type: 'string'             │
│                                │                             │   }, {                         │
│                                │                             │     type: 'number'             │
│                                │                             │   }],                          │
│                                │                             │   return: {                    │
│                                │                             │     type: 'boolean'            │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Promise(        │ type T = Promise<string>    │ const T = {                    │
│   Type.String()                │                             │   type: 'object',              │
│ )                              │                             │   instanceOf: 'Promise',       │
│                                │                             │   item: {                      │
│                                │                             │     type: 'string'             │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Uint8Array()    │ type T = Uint8Array         │ const T = {                    │
│                                │                             │   type: 'object',              │
│                                │                             │   instanceOf: 'Uint8Array'     │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Date()          │ type T = Date               │ const T = {                    │
│                                │                             │   type: 'object',              │
│                                │                             │   instanceOf: 'Date'           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Undefined()     │ type T = undefined          │ const T = {                    │
│                                │                             │   type: 'null',                │
│                                │                             │   typeOf: 'Undefined'          │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.RegEx(/foo/)    │ type T = string             │ const T = {                    │
│                                │                             │    type: 'string',             │
│                                │                             │    pattern: 'foo'              │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Symbol()        │ type T = symbol             │ const T = {                    │
│                                │                             │   type: 'null',                │
│                                │                             │   typeOf: 'Symbol'             │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.BigInt()        │ type T = bigint             │ const T = {                    │
│                                │                             │   type: 'null',                │
│                                │                             │   typeOf: 'BigInt'             │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Void()          │ type T = void               │ const T = {                    │
│                                │                             │   type: 'null'                 │
│                                │                             │   typeOf: 'Void'               │
│                                │                             │ }                              │
│                                │                             │                                │
└────────────────────────────────┴─────────────────────────────┴────────────────────────────────┘
```

<a name='types-modifiers'></a>

### Modifiers

TypeBox provides modifiers that allow schema properties to be statically inferred as `readonly` or `optional`. The following table shows the supported modifiers and how they map between TypeScript and JSON Schema.

```typescript
┌────────────────────────────────┬─────────────────────────────┬────────────────────────────────┐
│ TypeBox                        │ TypeScript                  │ JSON Schema                    │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const T = {                    │
│   name: Type.Optional(         │   name?: string             │   type: 'object',              │
│     Type.String()              │ }                           │   properties: {                │
│   )                            │                             │     name: {                    │
│ })  	                         │                             │       type: 'string'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const T = {                    │
│   name: Type.Readonly(         │   readonly name: string     │   type: 'object',              │
│     Type.String()              │ }                           │   properties: {                │
│   )                            │                             │     name: {                    │
│ })  	                         │                             │       type: 'string'           │
│                                │                             │     }                          │
│                                │                             │   },                           │
│                                │                             │   required: ['name']           │
│                                │                             │ }                              │
│                                │                             │                                │
├────────────────────────────────┼─────────────────────────────┼────────────────────────────────┤
│ const T = Type.Object({        │ type T = {                  │ const T = {                    │
│   name: Type.ReadonlyOptional( │   readonly name?: string    │   type: 'object',              │
│     Type.String()              │ }                           │   properties: {                │
│   )                            │                             │     name: {                    │
│ })  	                         │                             │       type: 'string'           │
│                                │                             │     }                          │
│                                │                             │   }                            │
│                                │                             │ }                              │
│                                │                             │                                │
└────────────────────────────────┴─────────────────────────────┴────────────────────────────────┘
```

<a name='types-options'></a>

### Options

You can pass JSON Schema options on the last argument of any type. Option hints specific to each type are provided for convenience.

```typescript
// String must be an email
const T = Type.String({                              // const T = { 
  format: 'email'                                    //   type: 'string',
})                                                   //   format: 'email' 
                                                     // }

// Mumber must be a multiple of 2
const T = Type.Number({                              // const T = { 
  multipleOf: 2                                      //  type: 'number', 
})                                                   //  multipleOf: 2 
                                                     // }

// Array must have at least 5 integer values
const T = Type.Array(Type.Integer(), {               // const T = { 
  minItems: 5                                        //   type: 'array',
})                                                   //   minItems: 5,        
                                                     //   items: { 
                                                     //     type: 'integer'
                                                     //   }
                                                     // }

```

<a name='types-generics'></a>

### Generic Types

Generic types can be created with generic functions constrained to type `TSchema`. The following creates a generic `Vector<T>` type.

```typescript
import { Type, Static, TSchema } from '@sinclair/typebox'

const Vector = <T extends TSchema>(t: T) => Type.Object({ x: t, y: t, z: t })

const NumberVector = Vector(Type.Number())           // const NumberVector = {
                                                     //   type: 'object',
                                                     //   required: ['x', 'y', 'z'],
                                                     //   properties: {
                                                     //     x: { type: 'number' },
                                                     //     y: { type: 'number' },
                                                     //     z: { type: 'number' }
                                                     //   }
                                                     // }

type NumberVector = Static<typeof NumberVector>      // type NumberVector = {
                                                     //   x: number,
                                                     //   y: number,
                                                     //   z: number
                                                     // }

const BooleanVector = Vector(Type.Boolean())         // const BooleanVector = {
                                                     //   type: 'object',
                                                     //   required: ['x', 'y', 'z'],
                                                     //   properties: {
                                                     //     x: { type: 'boolean' },
                                                     //     y: { type: 'boolean' },
                                                     //     z: { type: 'boolean' }
                                                     //   }
                                                     // }

type BooleanVector = Static<typeof BooleanVector>    // type BooleanVector = {
                                                     //   x: boolean,
                                                     //   y: boolean,
                                                     //   z: boolean
                                                     // }
```

The following creates a generic `Nullable<T>` type.

```typescript
const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])

const T = Nullable(Type.String())                   // const T = {
                                                    //   anyOf: [
                                                    //     { type: 'string' },
                                                    //     { type: 'null' }
                                                    //   ]
                                                    // }

type T = Static<typeof T>                           // type T = string | null
```

<a name='types-references'></a>

### Reference Types

Reference types are supported with `Type.Ref`. The target type must specify a valid `$id`.

```typescript
const T = Type.String({ $id: 'T' })                  // const T = {
                                                     //    $id: 'T',
                                                     //    type: 'string'
                                                     // }
                                             
const R = Type.Ref(T)                                // const R = {
                                                     //    $ref: 'T'
                                                     // }
```

<a name='types-recursive'></a>

### Recursive Types

Recursive types are supported with `Type.Recursive`

```typescript
const Node = Type.Recursive(Node => Type.Object({    // const Node = {
  id: Type.String(),                                 //   $id: 'Node',
  nodes: Type.Array(Node)                            //   type: 'object',
}), { $id: 'Node' })                                 //   properties: {
                                                     //     id: {
                                                     //       type: 'string'
                                                     //     },
                                                     //     nodes: {
                                                     //       type: 'array',
                                                     //       items: {
                                                     //         $ref: 'Node'
                                                     //       }
                                                     //     }
                                                     //   },
                                                     //   required: [
                                                     //     'id',
                                                     //     'nodes'
                                                     //   ]
                                                     // }

type Node = Static<typeof Node>                      // type Node = {
                                                     //   id: string
                                                     //   nodes: Node[]
                                                     // }

function test(node: Node) {
  const id = node.nodes[0].nodes[0].id               // id is string
}
```

<a name='types-conditional'></a>

### Conditional Types

Conditional types are supported with `Type.Extends`, `Type.Exclude` and `Type.Extract`

```typescript
// TypeScript

type T0 = string extends number ? true : false       // type T0 = false

type T1 = Extract<string | number, number>           // type T1 = number

type T2 = Exclude<string | number, number>           // type T2 = string

// TypeBox

const T0 = Type.Extends(Type.String(), Type.Number(), Type.Literal(true), Type.Literal(false))

const T1 = Type.Extract(Type.Union([Type.String(), Type.Number()]), Type.Number())

const T2 = Type.Exclude(Type.Union([Type.String(), Type.Number()]), Type.Number())


type T0 = Static<typeof T0>                        // type T0 = false

type T1 = Static<typeof T1>                        // type T1 = number

type T2 = Static<typeof T2>                        // type T2 = string 
```

<a name='types-template-literal'></a>

### Template Literal Types

Template Literal types are supported with `Type.TemplateLiteral`

```typescript
// TypeScript

type T = `option${'A'|'B'}`                          // type T = 'optionA' | 'optionB'

type R = Record<T, string>                           // type R = {
                                                     //   optionA: string
                                                     //   optionB: string
                                                     // }

// TypeBox

const T = Type.TemplateLiteral([                     // const T = {
  Type.Literal('option'),                            //   pattern: '^option(A|B)$',
  Type.Union([                                       //   type: 'string'
    Type.Literal('A'),                               // }
    Type.Literal('B')
  ])
])

const R = Type.Record(T, Type.String())              // const R = {
                                                     //   type: 'object',
                                                     //   required: ['optionA', 'optionB'],
                                                     //   properties: {
                                                     //     optionA: {
                                                     //       type: 'string'
                                                     //     },
                                                     //     optionB: {
                                                     //       type: 'string'
                                                     //     }
                                                     //   }
                                                     // }

type T = Static<typeof T>                            // type T = 'optionA' | 'optionB'

type R = Static<typeof R>                            // type R = {
                                                     //   optionA: string
                                                     //   optionB: string
                                                     // }
```

<a name='types-unsafe'></a>

### Unsafe

Use `Type.Unsafe` to create custom schematics with user defined inference rules.

```typescript
const T = Type.Unsafe<string>({ type: 'number' })    // const T = {
                                                     //   type: 'number'
                                                     // }

type T = Static<typeof T>                            // type T = string
```

The `Type.Unsafe` type can be useful to express specific OpenAPI schema representations.

```typescript
import { Type, Static, TSchema } from '@sinclair/typebox'

// Nullable<T>

function Nullable<T extends TSchema>(schema: T) {
  return Type.Unsafe<Static<T> | null>({ ...schema, nullable: true })
}

const T = Nullable(Type.String())                    // const T = {
                                                     //   type: 'string',
                                                     //   nullable: true
                                                     // }

type T = Static<typeof T>                            // type T = string | null

// StringEnum<string[]>

function StringEnum<T extends string[]>(values: [...T]) {
  return Type.Unsafe<T[number]>({ type: 'string', enum: values })
}

const T = StringEnum(['A', 'B', 'C'])                // const T = {
                                                     //   enum: ['A', 'B', 'C']
                                                     // }

type T = Static<typeof T>                            // type T = 'A' | 'B' | 'C'
```

<a name='types-guards'></a>

### Guards

TypeBox provides a `TypeGuard` module that can be used for reflection and asserting values as types.

```typescript
import { Type, TypeGuard } from '@sinclair/typebox'

const T = Type.String()

if(TypeGuard.TString(T)) {
    
  // T is TString
}
```

<a name='types-strict'></a>

### Strict

TypeBox schemas contain the `Kind` and `Modifier` symbol properties. These properties are used for type composition and reflection. These properties are not strictly valid JSON schema; so in some cases it may be desirable to omit them. TypeBox provides a `Type.Strict` function that will omit these properties if necessary.

```typescript
const T = Type.Object({                              // const T = {
  name: Type.Optional(Type.String())                 //   [Kind]: 'Object',
})                                                   //   type: 'object',
                                                     //   properties: {
                                                     //     name: {
                                                     //       [Kind]: 'String',
                                                     //       type: 'string',
                                                     //       [Modifier]: 'Optional'
                                                     //     }
                                                     //   }
                                                     // }

const U = Type.Strict(T)                             // const U = {
                                                     //   type: 'object', 
                                                     //   properties: { 
                                                     //     name: { 
                                                     //       type: 'string' 
                                                     //     } 
                                                     //   } 
                                                     // }
```

<a name='values'></a>

## Values

TypeBox provides an optional utility module that can be used to perform common operations on JavaScript values. This module includes functionality to create, check and cast values from types as well as check equality, clone, diff and patch JavaScript values. This module is provided via optional import.

```typescript
import { Value } from '@sinclair/typebox/value'
```

<a name='values-create'></a>

### Create

Use the Create function to create a value from a type. TypeBox will use default values if specified.

```typescript
const T = Type.Object({ x: Type.Number(), y: Type.Number({ default: 42 }) })

const A = Value.Create(T)                            // const A = { x: 0, y: 42 }
```

<a name='values-clone'></a>

### Clone

Use the Clone function to deeply clone a value

```typescript
const A = Value.Clone({ x: 1, y: 2, z: 3 })          // const A = { x: 1, y: 2, z: 3 }
```

<a name='values-check'></a>

### Check

Use the Check function to type check a value

```typescript
const T = Type.Object({ x: Type.Number() })

const R = Value.Check(T, { x: 1 })                   // const R = true
```

<a name='values-convert'></a>

### Convert

Use the Convert function to convert a value into its target type if a reasonable conversion is possible.

```typescript
const T = Type.Object({ x: Type.Number() })

const R1 = Value.Convert(T, { x: '3.14' })          // const R1 = { x: 3.14 }

const R2 = Value.Convert(T, { x: 'not a number' })  // const R2 = { x: 'not a number' }
```

<a name='values-cast'></a>

### Cast

Use the Cast function to cast a value into a type. The cast function will retain as much information as possible from the original value.

```typescript
const T = Type.Object({ x: Type.Number(), y: Type.Number() }, { additionalProperties: false })

const X = Value.Cast(T, null)                        // const X = { x: 0, y: 0 }

const Y = Value.Cast(T, { x: 1 })                    // const Y = { x: 1, y: 0 }

const Z = Value.Cast(T, { x: 1, y: 2, z: 3 })        // const Z = { x: 1, y: 2 }
```

<a name='values-equal'></a>

### Equal

Use the Equal function to deeply check for value equality.

```typescript
const R = Value.Equal(                               // const R = true
  { x: 1, y: 2, z: 3 },
  { x: 1, y: 2, z: 3 }
)
```

<a name='values-hash'></a>

### Hash

Use the Hash function to create a [FNV1A-64](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function) non cryptographic hash of a value.

```typescript
const A = Value.Hash({ x: 1, y: 2, z: 3 })          // const A = 2910466848807138541n

const B = Value.Hash({ x: 1, y: 4, z: 3 })          // const B = 1418369778807423581n
```

<a name='values-diff'></a>

### Diff

Use the Diff function to produce a sequence of edits to transform one value into another.

```typescript
const E = Value.Diff(                               // const E = [
  { x: 1, y: 2, z: 3 },                             //   { type: 'update', path: '/y', value: 4 },
  { y: 4, z: 5, w: 6 }                              //   { type: 'update', path: '/z', value: 5 },
)                                                   //   { type: 'insert', path: '/w', value: 6 },
                                                    //   { type: 'delete', path: '/x' }
                                                    // ]
```

<a name='values-patch'></a>

### Patch

Use the Patch function to apply edits

```typescript
const A = { x: 1, y: 2 }

const B = { x: 3 }

const E = Value.Diff(A, B)                           // const E = [
                                                     //   { type: 'update', path: '/x', value: 3 },
                                                     //   { type: 'delete', path: '/y' }
                                                     // ]

const C = Value.Patch<typeof B>(A, E)                // const C = { x: 3 }
```

<a name='values-errors'></a>

### Errors

Use the Errors function enumerate validation errors.

```typescript
const T = Type.Object({ x: Type.Number(), y: Type.Number() })

const R = [...Value.Errors(T, { x: '42' })]          // const R = [{
                                                     //   schema: { type: 'number' },
                                                     //   path: '/x',
                                                     //   value: '42',
                                                     //   message: 'Expected number'
                                                     // }, {
                                                     //   schema: { type: 'number' },
                                                     //   path: '/y',
                                                     //   value: undefined,
                                                     //   message: 'Expected number'
                                                     // }]
```

<a name='values-mutate'></a>

### Mutate

Use the Mutate function to perform a deep mutable value assignment while retaining internal references.

```typescript
const Y = { z: 1 }                                   // const Y = { z: 1 } 

const X = { y: Y }                                   // const X = { y: { z: 1 } }

const A = { x: X }                                   // const A = { x: { y: { z: 1 } } }             


Value.Mutate(A, { x: { y: { z: 2 } } })              // const A' = { x: { y: { z: 2 } } }   

const R0 = A.x.y.z === 2                             // const R0 = 2

const R1 = A.x.y === Y                               // const R1 = true

const R2 = A.x === X                                 // const R2 = true
```     

<a name='values-pointer'></a>

### Pointer

Use ValuePointer to perform mutable updates on existing values using [RFC6901](https://www.rfc-editor.org/rfc/rfc6901) JSON Pointers.

```typescript
import { ValuePointer } from '@sinclair/typebox/value'

const A = { x: 0, y: 0, z: 0 }

ValuePointer.Set(A, '/x', 1)                         // const A' = { x: 1, y: 0, z: 0 }

ValuePointer.Set(A, '/y', 1)                         // const A' = { x: 1, y: 1, z: 0 }

ValuePointer.Set(A, '/z', 1)                         // const A' = { x: 1, y: 1, z: 1 }
```

<a name='typecheck'></a>

## TypeCheck

TypeBox types target JSON Schema draft 6 so are compatible with any validator that supports this specification. TypeBox also provides a built in type checking compiler designed specifically for high performance compilation and value assertion.

The following sections detail using Ajv and TypeBox's compiler infrastructure.

<a name='typecheck-ajv'></a>

## Ajv

The following shows the recommended setup for Ajv.

```bash
$ npm install ajv ajv-formats --save
```

```typescript
import { Type }   from '@sinclair/typebox'
import addFormats from 'ajv-formats'
import Ajv        from 'ajv'

const ajv = addFormats(new Ajv({}), [
  'date-time', 
  'time', 
  'date', 
  'email',  
  'hostname', 
  'ipv4', 
  'ipv6', 
  'uri', 
  'uri-reference', 
  'uuid',
  'uri-template', 
  'json-pointer', 
  'relative-json-pointer', 
  'regex'
])

const C = ajv.compile(Type.Object({                
  x: Type.Number(),
  y: Type.Number(),
  z: Type.Number()
}))

const R = C({ x: 1, y: 2, z: 3 })                    // const R = true 
```

<a name='typecheck-typecompiler'></a>

### TypeCompiler

The TypeBox TypeCompiler is a high performance JIT compiler that transforms TypeBox types into optimized JavaScript validation routines. The compiler is tuned for fast compilation as well as fast value assertion. It is designed to serve as a validation backend that can be integrated into larger applications; but can also be used as a general purpose validator.

The TypeCompiler is provided as an optional import.

```typescript
import { TypeCompiler } from '@sinclair/typebox/compiler'
```

Use the `Compile(...)` function to compile a type.

```typescript
const C = TypeCompiler.Compile(Type.Object({         // const C: TypeCheck<TObject<{
  x: Type.Number(),                                  //     x: TNumber;
  y: Type.Number(),                                  //     y: TNumber;
  z: Type.Number()                                   //     z: TNumber;
}))                                                  // }>>

const R = C.Check({ x: 1, y: 2, z: 3 })              // const R = true
```

Use the `Errors(...)` function to produce diagnostic errors for a value. The `Errors(...)` function will return an iterator that if enumerated; will perform an exhaustive check across the entire value and yield any error found. For performance, this function should only be called after failed `Check(...)`. Applications may also choose to yield only the first value to avoid exhaustive error generation.

```typescript
const C = TypeCompiler.Compile(Type.Object({         // const C: TypeCheck<TObject<{
  x: Type.Number(),                                  //     x: TNumber;
  y: Type.Number(),                                  //     y: TNumber;
  z: Type.Number()                                   //     z: TNumber;
}))                                                  // }>>

const value = { }

const errors = [...C.Errors(value)]                  // const errors = [{
                                                     //   schema: { type: 'number' },
                                                     //   path: '/x',
                                                     //   value: undefined,
                                                     //   message: 'Expected number'
                                                     // }, {
                                                     //   schema: { type: 'number' },
                                                     //   path: '/y',
                                                     //   value: undefined,
                                                     //   message: 'Expected number'
                                                     // }, {
                                                     //   schema: { type: 'number' },
                                                     //   path: '/z',
                                                     //   value: undefined,
                                                     //   message: 'Expected number'
                                                     // }]
```

Compiled routines can be inspected with the `.Code()` function.

```typescript
const C = TypeCompiler.Compile(Type.String())        // const C: TypeCheck<TString>

console.log(C.Code())                                // return function check(value) {
                                                     //   return (
                                                     //     (typeof value === 'string')
                                                     //   )
                                                     // }
```

<a name='typesystem'></a>

## TypeSystem

The TypeBox TypeSystem module provides functionality to define types above and beyond the Standard and Extended type sets as well as control various assertion polices. Configurations made to the TypeSystem module are observed by both `TypeCompiler` and `Value` modules.

The TypeSystem module is provided as an optional import.

```typescript
import { TypeSystem } from '@sinclair/typebox/system'
```

<a name='typesystem-types'></a>

### Types

Use the `Type(...)` function to create a custom type. This function will return a type factory function that can be used to construct the type. The following creates a Point type.

```typescript
type PointOptions = { }                              // The Type Options

type PointType = { x: number, y: number }            // The Static<T> Type

const Point = TypeSystem.Type<PointType, PointOptions>('Point', (options, value) => {
  return (
    typeof value === 'object' && value !== null &&
    typeof value.x === 'number' && 
    typeof value.y === 'number'
  )
})

const T = Point()

type T = Static<typeof T>                             // type T = { x: number, y: number }

const R = Value.Check(T, { x: 1, y: 2 })              // const R = true
```

<a name='typesystem-formats'></a>

### Formats

Use the `Format(...)` function to create a custom string format. The following creates a format that checks for lowercase strings.

```typescript
TypeSystem.Format('lowercase', value => value === value.toLowerCase()) // format should be lowercase

const T = Type.String({ format: 'lowercase' })       

const A = Value.Check(T, 'Hello')                    // const A = false

const B = Value.Check(T, 'hello')                    // const B = true
```

<a name='typesystem-policies'></a>

### Policies

TypeBox validates using JSON Schema assertion policies by default. It is possible to override these policies and have TypeBox assert using TypeScript policies. The following overrides are available.

```typescript
// Allow arrays to validate as object types (default is false)
//
// const A: {} = [] - allowed in TS

TypeSystem.AllowArrayObjects = true                  

// Allow numeric values to be NaN or + or - Infinity (default is false)
//
// const A: number = NaN - allowed in TS

TypeSystem.AllowNaN = true                      
```

<a name='benchmark'></a>

## Benchmark

This project maintains a set of benchmarks that measure Ajv, Value and TypeCompiler compilation and validation performance. These benchmarks can be run locally by cloning this repository and running `npm run benchmark`. The results below show for Ajv version 8.12.0. 

For additional comparative benchmarks, please refer to [typescript-runtime-type-benchmarks](https://moltar.github.io/typescript-runtime-type-benchmarks/).

<a name='benchmark-compile'></a>

### Compile

This benchmark measures compilation performance for varying types. You can review this benchmark [here](https://github.com/sinclairzx81/typebox/blob/master/benchmark/measurement/module/compile.ts).

```typescript
┌────────────────────────────┬────────────┬──────────────┬──────────────┬──────────────┐
│          (index)           │ Iterations │     Ajv      │ TypeCompiler │ Performance  │
├────────────────────────────┼────────────┼──────────────┼──────────────┼──────────────┤
│ Literal_String             │    1000    │ '    257 ms' │ '      8 ms' │ '   32.13 x' │
│ Literal_Number             │    1000    │ '    203 ms' │ '      4 ms' │ '   50.75 x' │
│ Literal_Boolean            │    1000    │ '    183 ms' │ '      4 ms' │ '   45.75 x' │
│ Primitive_Number           │    1000    │ '    174 ms' │ '      8 ms' │ '   21.75 x' │
│ Primitive_String           │    1000    │ '    158 ms' │ '      9 ms' │ '   17.56 x' │
│ Primitive_String_Pattern   │    1000    │ '    213 ms' │ '     13 ms' │ '   16.38 x' │
│ Primitive_Boolean          │    1000    │ '    136 ms' │ '      6 ms' │ '   22.67 x' │
│ Primitive_Null             │    1000    │ '    144 ms' │ '      6 ms' │ '   24.00 x' │
│ Object_Unconstrained       │    1000    │ '   1176 ms' │ '     38 ms' │ '   30.95 x' │
│ Object_Constrained         │    1000    │ '   1181 ms' │ '     31 ms' │ '   38.10 x' │
│ Object_Vector3             │    1000    │ '    387 ms' │ '      8 ms' │ '   48.38 x' │
│ Object_Box3D               │    1000    │ '   1693 ms' │ '     25 ms' │ '   67.72 x' │
│ Tuple_Primitive            │    1000    │ '    470 ms' │ '     15 ms' │ '   31.33 x' │
│ Tuple_Object               │    1000    │ '   1206 ms' │ '     17 ms' │ '   70.94 x' │
│ Composite_Intersect        │    1000    │ '    567 ms' │ '     20 ms' │ '   28.35 x' │
│ Composite_Union            │    1000    │ '    515 ms' │ '     21 ms' │ '   24.52 x' │
│ Math_Vector4               │    1000    │ '    787 ms' │ '     10 ms' │ '   78.70 x' │
│ Math_Matrix4               │    1000    │ '    386 ms' │ '      8 ms' │ '   48.25 x' │
│ Array_Primitive_Number     │    1000    │ '    349 ms' │ '      7 ms' │ '   49.86 x' │
│ Array_Primitive_String     │    1000    │ '    336 ms' │ '      4 ms' │ '   84.00 x' │
│ Array_Primitive_Boolean    │    1000    │ '    284 ms' │ '      3 ms' │ '   94.67 x' │
│ Array_Object_Unconstrained │    1000    │ '   1704 ms' │ '     19 ms' │ '   89.68 x' │
│ Array_Object_Constrained   │    1000    │ '   1456 ms' │ '     18 ms' │ '   80.89 x' │
│ Array_Tuple_Primitive      │    1000    │ '    792 ms' │ '     15 ms' │ '   52.80 x' │
│ Array_Tuple_Object         │    1000    │ '   1552 ms' │ '     17 ms' │ '   91.29 x' │
│ Array_Composite_Intersect  │    1000    │ '    744 ms' │ '     18 ms' │ '   41.33 x' │
│ Array_Composite_Union      │    1000    │ '    783 ms' │ '     15 ms' │ '   52.20 x' │
│ Array_Math_Vector4         │    1000    │ '   1093 ms' │ '     14 ms' │ '   78.07 x' │
│ Array_Math_Matrix4         │    1000    │ '    684 ms' │ '      6 ms' │ '  114.00 x' │
└────────────────────────────┴────────────┴──────────────┴──────────────┴──────────────┘
```

<a name='benchmark-validate'></a>

### Validate

This benchmark measures validation performance for varying types. You can review this benchmark [here](https://github.com/sinclairzx81/typebox/blob/master/benchmark/measurement/module/check.ts).

```typescript
┌────────────────────────────┬────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│          (index)           │ Iterations │  ValueCheck  │     Ajv      │ TypeCompiler │ Performance  │
├────────────────────────────┼────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Literal_String             │  1000000   │ '     27 ms' │ '      6 ms' │ '      5 ms' │ '    1.20 x' │
│ Literal_Number             │  1000000   │ '     23 ms' │ '     21 ms' │ '     11 ms' │ '    1.91 x' │
│ Literal_Boolean            │  1000000   │ '     21 ms' │ '     20 ms' │ '     10 ms' │ '    2.00 x' │
│ Primitive_Number           │  1000000   │ '     26 ms' │ '     19 ms' │ '     11 ms' │ '    1.73 x' │
│ Primitive_String           │  1000000   │ '     25 ms' │ '     19 ms' │ '     10 ms' │ '    1.90 x' │
│ Primitive_String_Pattern   │  1000000   │ '    155 ms' │ '     49 ms' │ '     43 ms' │ '    1.14 x' │
│ Primitive_Boolean          │  1000000   │ '     23 ms' │ '     19 ms' │ '     10 ms' │ '    1.90 x' │
│ Primitive_Null             │  1000000   │ '     24 ms' │ '     19 ms' │ '     10 ms' │ '    1.90 x' │
│ Object_Unconstrained       │  1000000   │ '    804 ms' │ '     35 ms' │ '     28 ms' │ '    1.25 x' │
│ Object_Constrained         │  1000000   │ '   1041 ms' │ '     55 ms' │ '     41 ms' │ '    1.34 x' │
│ Object_Vector3             │  1000000   │ '    380 ms' │ '     26 ms' │ '     20 ms' │ '    1.30 x' │
│ Object_Box3D               │  1000000   │ '   1785 ms' │ '     65 ms' │ '     52 ms' │ '    1.25 x' │
│ Object_Recursive           │  1000000   │ '   4984 ms' │ '    396 ms' │ '    114 ms' │ '    3.47 x' │
│ Tuple_Primitive            │  1000000   │ '    168 ms' │ '     24 ms' │ '     16 ms' │ '    1.50 x' │
│ Tuple_Object               │  1000000   │ '    673 ms' │ '     30 ms' │ '     26 ms' │ '    1.15 x' │
│ Composite_Intersect        │  1000000   │ '    751 ms' │ '     28 ms' │ '     20 ms' │ '    1.40 x' │
│ Composite_Union            │  1000000   │ '    489 ms' │ '     24 ms' │ '     16 ms' │ '    1.50 x' │
│ Math_Vector4               │  1000000   │ '    259 ms' │ '     23 ms' │ '     13 ms' │ '    1.77 x' │
│ Math_Matrix4               │  1000000   │ '   1002 ms' │ '     40 ms' │ '     30 ms' │ '    1.33 x' │
│ Array_Primitive_Number     │  1000000   │ '    252 ms' │ '     22 ms' │ '     15 ms' │ '    1.47 x' │
│ Array_Primitive_String     │  1000000   │ '    227 ms' │ '     22 ms' │ '     18 ms' │ '    1.22 x' │
│ Array_Primitive_Boolean    │  1000000   │ '    150 ms' │ '     23 ms' │ '     22 ms' │ '    1.05 x' │
│ Array_Object_Unconstrained │  1000000   │ '   4754 ms' │ '     71 ms' │ '     64 ms' │ '    1.11 x' │
│ Array_Object_Constrained   │  1000000   │ '   4787 ms' │ '    142 ms' │ '    123 ms' │ '    1.15 x' │
│ Array_Object_Recursive     │  1000000   │ '  19088 ms' │ '   1735 ms' │ '    314 ms' │ '    5.53 x' │
│ Array_Tuple_Primitive      │  1000000   │ '    650 ms' │ '     41 ms' │ '     31 ms' │ '    1.32 x' │
│ Array_Tuple_Object         │  1000000   │ '   2770 ms' │ '     67 ms' │ '     55 ms' │ '    1.22 x' │
│ Array_Composite_Intersect  │  1000000   │ '   2693 ms' │ '     50 ms' │ '     39 ms' │ '    1.28 x' │
│ Array_Composite_Union      │  1000000   │ '   1982 ms' │ '     72 ms' │ '     33 ms' │ '    2.18 x' │
│ Array_Math_Vector4         │  1000000   │ '   1068 ms' │ '     40 ms' │ '     26 ms' │ '    1.54 x' │
│ Array_Math_Matrix4         │  1000000   │ '   4609 ms' │ '    115 ms' │ '     88 ms' │ '    1.31 x' │
└────────────────────────────┴────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

<a name='benchmark-compression'></a>

### Compression

The following table lists esbuild compiled and minified sizes for each TypeBox module.

```typescript
┌──────────────────────┬────────────┬────────────┬─────────────┐
│       (index)        │  Compiled  │  Minified  │ Compression │
├──────────────────────┼────────────┼────────────┼─────────────┤
│ typebox/compiler     │ '124.3 kb' │ ' 55.7 kb' │  '2.23 x'   │
│ typebox/errors       │ '107.8 kb' │ ' 47.9 kb' │  '2.25 x'   │
│ typebox/system       │ ' 73.3 kb' │ ' 30.2 kb' │  '2.43 x'   │
│ typebox/value        │ '170.7 kb' │ ' 74.2 kb' │  '2.30 x'   │
│ typebox              │ ' 72.0 kb' │ ' 29.7 kb' │  '2.43 x'   │
└──────────────────────┴────────────┴────────────┴─────────────┘
```

<a name='contribute'></a>

## Contribute

TypeBox is open to community contribution. Please ensure you submit an open issue before submitting your pull request. The TypeBox project preferences open community discussion prior to accepting new features.
