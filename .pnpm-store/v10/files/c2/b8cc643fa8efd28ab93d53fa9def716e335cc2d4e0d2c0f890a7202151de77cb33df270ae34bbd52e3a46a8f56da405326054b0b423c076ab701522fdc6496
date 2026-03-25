/// <reference types="node" />

import Parser = require("./Parser");

export = make;

declare function make(options?: Parser.ParserOptions): Parser;

type ParserClass = Parser;
type ParserType = typeof Parser;

declare namespace make {
    type Parser = ParserClass;
    const Parser: ParserType;
    function parser(options?: Parser.ParserOptions): Parser;
}
