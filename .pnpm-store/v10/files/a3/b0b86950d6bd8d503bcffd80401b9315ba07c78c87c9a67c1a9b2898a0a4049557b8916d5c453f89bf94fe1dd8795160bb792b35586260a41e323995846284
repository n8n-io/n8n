// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as path from 'node:path';
import { Path, Text } from '@rushstack/node-core-library';
export class SourceFileLocationFormatter {
    /**
     * Returns a string such as this, based on the context information in the provided node:
     *   "[C:\Folder\File.ts#123]"
     */
    static formatDeclaration(node, workingPackageFolderPath) {
        const sourceFile = node.getSourceFile();
        const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        return SourceFileLocationFormatter.formatPath(sourceFile.fileName, {
            sourceFileLine: lineAndCharacter.line + 1,
            sourceFileColumn: lineAndCharacter.character + 1,
            workingPackageFolderPath
        });
    }
    static formatPath(sourceFilePath, options) {
        if (!options) {
            options = {};
        }
        let result = '';
        // Make the path relative to the workingPackageFolderPath
        let scrubbedPath = sourceFilePath;
        if (options.workingPackageFolderPath) {
            // If it's under the working folder, make it a relative path
            if (Path.isUnderOrEqual(sourceFilePath, options.workingPackageFolderPath)) {
                scrubbedPath = path.relative(options.workingPackageFolderPath, sourceFilePath);
            }
        }
        // Convert it to a Unix-style path
        scrubbedPath = Text.replaceAll(scrubbedPath, '\\', '/');
        result += scrubbedPath;
        if (options.sourceFileLine) {
            result += `:${options.sourceFileLine}`;
            if (options.sourceFileColumn) {
                result += `:${options.sourceFileColumn}`;
            }
        }
        return result;
    }
}
//# sourceMappingURL=SourceFileLocationFormatter.js.map