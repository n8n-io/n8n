// A tsserver plugin that adds the n8n expression check to the editor. It needs a TypeScript with
// a JavaScript language service (TypeScript 6 or older): the native TypeScript 7 server loads no
// plugins. Enable it in tsconfig: `"plugins": [{ "name": "@n8n/expression-types/plugin" }]`.
import { expressionPlugin } from './plugin';

export = expressionPlugin;
