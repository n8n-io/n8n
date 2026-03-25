import { LRLanguage, LanguageSupport } from '@codemirror/language';
import * as _codemirror_autocomplete from '@codemirror/autocomplete';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
Completion source that looks up locally defined names in
Python code.
*/
declare function localCompletionSource(context: CompletionContext): CompletionResult | null;
/**
Autocompletion for built-in Python globals and keywords.
*/
declare const globalCompletion: _codemirror_autocomplete.CompletionSource;

/**
A language provider based on the [Lezer Python
parser](https://github.com/lezer-parser/python), extended with
highlighting and indentation information.
*/
declare const pythonLanguage: LRLanguage;
/**
Python language support.
*/
declare function python(): LanguageSupport;

export { globalCompletion, localCompletionSource, python, pythonLanguage };
