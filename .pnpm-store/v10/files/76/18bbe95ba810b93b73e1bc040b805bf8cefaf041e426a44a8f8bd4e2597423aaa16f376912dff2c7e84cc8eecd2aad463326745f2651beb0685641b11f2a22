import path from 'node:path';
import debug from 'debug';
const log = debug('eslint-plugin-import-x:utils:ignore');
let cachedSet;
let lastSettings;
function validExtensions(context) {
    if (cachedSet && context.settings === lastSettings) {
        return cachedSet;
    }
    lastSettings = context.settings;
    cachedSet = getFileExtensions(context.settings);
    return cachedSet;
}
export function getFileExtensions(settings) {
    const exts = new Set(settings['import-x/extensions'] || ['.js', '.mjs', '.cjs']);
    if ('import-x/parsers' in settings) {
        for (const parser in settings['import-x/parsers']) {
            const parserSettings = settings['import-x/parsers'][parser];
            if (!Array.isArray(parserSettings)) {
                throw new TypeError(`"settings" for ${parser} must be an array`);
            }
            for (const ext of parserSettings)
                exts.add(ext);
        }
    }
    return exts;
}
export function ignore(filepath, context, skipExtensionCheck = false) {
    if (!skipExtensionCheck && !hasValidExtension(filepath, context)) {
        return true;
    }
    const ignoreStrings = context.settings['import-x/ignore'];
    if (!ignoreStrings?.length) {
        return false;
    }
    for (let i = 0, len = ignoreStrings.length; i < len; i++) {
        const ignoreString = ignoreStrings[i];
        const regex = new RegExp(ignoreString);
        if (regex.test(filepath)) {
            log(`ignoring ${filepath}, matched pattern /${ignoreString}/`);
            return true;
        }
    }
    return false;
}
export function hasValidExtension(filepath, context) {
    return validExtensions(context).has(path.extname(filepath));
}
//# sourceMappingURL=ignore.js.map