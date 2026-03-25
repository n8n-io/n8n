import { fork, string, url, tokenTypes as TYPE } from 'css-tree';
import compress from './compress.js';
import specificity from './restructure/prepare/specificity.js';

function encodeString(value) {
    const stringApostrophe = string.encode(value, true);
    const stringQuote = string.encode(value);

    return stringApostrophe.length < stringQuote.length
        ? stringApostrophe
        : stringQuote;
}

const {
    lexer,
    tokenize,
    parse,
    generate,
    walk,
    find,
    findLast,
    findAll,
    fromPlainObject,
    toPlainObject
} = fork({
    node: {
        String: {
            generate(node) {
                this.token(TYPE.String, encodeString(node.value));
            }
        },
        Url: {
            generate(node) {
                const encodedUrl = url.encode(node.value);
                const string = encodeString(node.value);

                this.token(TYPE.Url,
                    encodedUrl.length <= string.length + 5 /* "url()".length */
                        ? encodedUrl
                        : 'url(' + string + ')'
                );
            }
        }
    }
});

export {
    lexer,
    tokenize,
    parse,
    generate,
    walk,
    find,
    findLast,
    findAll,
    fromPlainObject,
    toPlainObject,
    specificity,
    compress
};
