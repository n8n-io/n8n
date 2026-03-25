import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';

/**
Calls
[`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
on the document and, if that throws an error, reports it as a
single diagnostic.
*/
declare const jsonParseLinter: () => (view: EditorView) => Diagnostic[];

/**
A language provider that provides JSON parsing.
*/
declare const jsonLanguage: LRLanguage;
/**
JSON language support.
*/
declare function json(): LanguageSupport;

export { json, jsonLanguage, jsonParseLinter };
