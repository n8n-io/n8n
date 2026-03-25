import { CCError } from "./utils.js";
import { Word } from "./shell/Word.js";
import { tokenize } from "./shell/tokenizer.js";
import * as curl from "./curl/opts.js";
import {
  curlLongOpts,
  curlLongOptsShortened,
  curlShortOpts,
} from "./curl/opts.js";
import { buildRequests } from "./Request.js";
import type { Request, RequestUrl } from "./Request.js";
import type { Warnings } from "./Warnings.js";

export { COMMON_SUPPORTED_ARGS } from "./curl/opts.js";
export { getFirst } from "./Request.js";

export type { Request, RequestUrl, Warnings };

export function clip(s: string, maxLength = 30): string {
  if (s.length > maxLength) {
    return s.slice(0, maxLength - 3) + "...";
  }
  return s;
}

function findCommands(
  curlCommand: string | string[],
  warnings: Warnings,
): [Word[], Word?, Word?][] {
  if (typeof curlCommand === "string") {
    return tokenize(curlCommand, warnings);
  }

  if (curlCommand.length === 0) {
    throw new CCError("no arguments provided");
  }
  if (curlCommand[0].trim() !== "curl") {
    throw new CCError(
      'command should begin with "curl" but instead begins with ' +
        JSON.stringify(clip(curlCommand[0])),
    );
  }
  return [[curlCommand.map((arg) => new Word(arg)), undefined, undefined]];
}

/**
 * Accepts a string of Bash code or a tokenized argv array.
 * Returns an array of parsed curl objects.
 * @param command a string of Bash code containing at least one curl command or an
 * array of shell argument tokens (meant for passing process.argv).
 */
export function parse(
  command: string | string[],
  supportedArgs?: Set<string>,
  warnings: Warnings = [],
): Request[] {
  let requests: Request[] = [];
  const curlCommands = findCommands(command, warnings);
  for (const [argv, stdin, stdinFile] of curlCommands) {
    const [globalConfig] = curl.parseArgs(
      argv,
      curlLongOpts,
      curlLongOptsShortened,
      curlShortOpts,
      supportedArgs,
      warnings,
    );

    requests = requests.concat(buildRequests(globalConfig, stdin, stdinFile));
  }
  return requests;
}
