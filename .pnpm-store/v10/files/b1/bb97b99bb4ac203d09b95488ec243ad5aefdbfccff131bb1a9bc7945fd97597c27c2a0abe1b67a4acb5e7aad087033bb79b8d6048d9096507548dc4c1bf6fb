// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as argparse from 'argparse';
export class CommandLineParserExitError extends Error {
    constructor(exitCode, message) {
        super(message);
        // Manually set the prototype, as we can no longer extend built-in classes like Error, Array, Map, etc
        // https://github.com/microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        //
        // Note: the prototype must also be set on any classes which extend this one
        this.__proto__ = CommandLineParserExitError.prototype; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.exitCode = exitCode;
    }
}
export class CustomArgumentParser extends argparse.ArgumentParser {
    exit(status, message) {
        throw new CommandLineParserExitError(status, message);
    }
    error(err) {
        // Ensure the ParserExitError bubbles up to the top without any special processing
        if (err instanceof CommandLineParserExitError) {
            throw err;
        }
        super.error(err);
    }
}
//# sourceMappingURL=CommandLineParserExitError.js.map