////////////////////////////////////////
// For pg-minify v1.6.3 or later.
////////////////////////////////////////

declare namespace pgMinify {

    interface IMinifyOptions {
        compress?: boolean;
        removeAll?: boolean;
    }

    interface IErrorPosition {
        line: number;
        column: number;
    }

    enum parsingErrorCode {
        unclosedMLC = 0,    // Unclosed multi-line comment.
        unclosedText = 1,   // Unclosed text block.
        unclosedQI = 2,     // Unclosed quoted identifier.
        multiLineQI = 3     // Multi-line quoted identifiers are not supported.
    }

    class SQLParsingError implements Error {
        name: string;
        message: string;
        stack: string;
        error: string;
        code: parsingErrorCode;
        position: IErrorPosition;
    }
}

declare function pgMinify(sql: string, options?: pgMinify.IMinifyOptions): string;

export = pgMinify;
