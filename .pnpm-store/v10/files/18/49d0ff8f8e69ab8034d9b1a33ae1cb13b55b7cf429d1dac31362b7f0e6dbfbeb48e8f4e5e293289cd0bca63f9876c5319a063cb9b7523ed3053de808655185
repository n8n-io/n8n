import { parser } from '@lezer/json';
import { LRLanguage, indentNodeProp, continuedIndent, foldNodeProp, foldInside, LanguageSupport } from '@codemirror/language';

/**
Calls
[`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
on the document and, if that throws an error, reports it as a
single diagnostic.
*/
const jsonParseLinter = () => (view) => {
    try {
        JSON.parse(view.state.doc.toString());
    }
    catch (e) {
        if (!(e instanceof SyntaxError))
            throw e;
        const pos = getErrorPosition(e, view.state.doc);
        return [{
                from: pos,
                message: e.message,
                severity: 'error',
                to: pos
            }];
    }
    return [];
};
function getErrorPosition(error, doc) {
    let m;
    if (m = error.message.match(/at position (\d+)/))
        return Math.min(+m[1], doc.length);
    if (m = error.message.match(/at line (\d+) column (\d+)/))
        return Math.min(doc.line(+m[1]).from + (+m[2]) - 1, doc.length);
    return 0;
}

/**
A language provider that provides JSON parsing.
*/
const jsonLanguage = /*@__PURE__*/LRLanguage.define({
    name: "json",
    parser: /*@__PURE__*/parser.configure({
        props: [
            /*@__PURE__*/indentNodeProp.add({
                Object: /*@__PURE__*/continuedIndent({ except: /^\s*\}/ }),
                Array: /*@__PURE__*/continuedIndent({ except: /^\s*\]/ })
            }),
            /*@__PURE__*/foldNodeProp.add({
                "Object Array": foldInside
            })
        ]
    }),
    languageData: {
        closeBrackets: { brackets: ["[", "{", '"'] },
        indentOnInput: /^\s*[\}\]]$/
    }
});
/**
JSON language support.
*/
function json() {
    return new LanguageSupport(jsonLanguage);
}

export { json, jsonLanguage, jsonParseLinter };
