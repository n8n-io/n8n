// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as os from 'node:os';
import { Colorize } from '@rushstack/terminal';
import { ApiExtractorCommandLine } from './cli/ApiExtractorCommandLine';
import { Extractor } from './api/Extractor';
console.log(os.EOL +
    Colorize.bold(`api-extractor ${Extractor.version} ` + Colorize.cyan(' - https://api-extractor.com/') + os.EOL));
const parser = new ApiExtractorCommandLine();
parser.executeAsync().catch((error) => {
    console.error(Colorize.red(`An unexpected error occurred: ${error}`));
    process.exit(1);
});
//# sourceMappingURL=start.js.map