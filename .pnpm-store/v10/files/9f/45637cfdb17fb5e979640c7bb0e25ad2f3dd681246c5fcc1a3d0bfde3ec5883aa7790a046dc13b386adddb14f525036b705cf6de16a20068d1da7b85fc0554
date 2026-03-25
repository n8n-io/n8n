"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpandNpmShortcut = void 0;
/**
 * Expands commands prefixed with `npm:`, `yarn:`, `pnpm:`, or `bun:` into the full version `npm run <command>` and so on.
 */
class ExpandNpmShortcut {
    parse(commandInfo) {
        const [, npmCmd, cmdName, args] = commandInfo.command.match(/^(npm|yarn|pnpm|bun):(\S+)(.*)/) || [];
        if (!cmdName) {
            return commandInfo;
        }
        return {
            ...commandInfo,
            name: commandInfo.name || cmdName,
            command: `${npmCmd} run ${cmdName}${args}`,
        };
    }
}
exports.ExpandNpmShortcut = ExpandNpmShortcut;
