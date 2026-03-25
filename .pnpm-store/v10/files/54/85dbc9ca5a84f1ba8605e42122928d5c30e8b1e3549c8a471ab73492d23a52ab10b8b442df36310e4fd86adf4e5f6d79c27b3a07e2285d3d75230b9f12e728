import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { getAllNamedOptions, hasOptions } from './rule-options.js';
import { loadPlugin, getPluginPrefix, getPluginRoot, getPathWithExactFileNameCasing, } from './package-json.js';
import { updateRulesList } from './rule-list.js';
import { updateConfigsList } from './config-list.js';
import { generateRuleHeaderLines } from './rule-doc-notices.js';
import { parseRuleDocNoticesOption, parseRuleListColumnsOption, parseConfigEmojiOptions, } from './option-parsers.js';
import { BEGIN_RULE_OPTIONS_LIST_MARKER, END_RULE_HEADER_MARKER, END_RULE_OPTIONS_LIST_MARKER, } from './comment-markers.js';
import { replaceOrCreateHeader, expectContentOrFail, expectSectionHeaderOrFail, } from './markdown.js';
import { resolveConfigsToRules } from './plugin-config-resolution.js';
import { OPTION_DEFAULTS } from './options.js';
import { diff } from 'jest-diff';
import { OPTION_TYPE } from './types.js';
import { replaceRulePlaceholder } from './rule-link.js';
import { updateRuleOptionsList } from './rule-options-list.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getEndOfLine } from './string.js';
function stringOrArrayWithFallback(stringOrArray, fallback) {
    return stringOrArray && stringOrArray.length > 0 ? stringOrArray : fallback;
}
function stringOrArrayToArrayWithFallback(stringOrArray, fallback) {
    const asArray = stringOrArray instanceof Array // eslint-disable-line unicorn/no-instanceof-builtins -- using Array.isArray() loses type information about the array.
        ? stringOrArray
        : stringOrArray
            ? [stringOrArray]
            : [];
    const csvStringItem = asArray.find((item) => item.includes(','));
    if (csvStringItem) {
        throw new Error(`Provide property as array, not a CSV string: ${csvStringItem}`);
    }
    return asArray.length > 0 ? asArray : fallback;
}
// eslint-disable-next-line complexity
export async function generate(path, options) {
    const EOL = getEndOfLine();
    const plugin = await loadPlugin(path);
    const pluginPrefix = await getPluginPrefix(path);
    const configsToRules = await resolveConfigsToRules(plugin);
    if (!plugin.rules) {
        throw new Error('Could not find exported `rules` object in ESLint plugin.');
    }
    // Options. Add default values as needed.
    const check = options?.check ?? OPTION_DEFAULTS[OPTION_TYPE.CHECK];
    const configEmojis = parseConfigEmojiOptions(plugin, options?.configEmoji);
    const configFormat = options?.configFormat ?? OPTION_DEFAULTS[OPTION_TYPE.CONFIG_FORMAT];
    const ignoreConfig = stringOrArrayWithFallback(options?.ignoreConfig, OPTION_DEFAULTS[OPTION_TYPE.IGNORE_CONFIG]);
    const ignoreDeprecatedRules = options?.ignoreDeprecatedRules ??
        OPTION_DEFAULTS[OPTION_TYPE.IGNORE_DEPRECATED_RULES];
    const initRuleDocs = options?.initRuleDocs ?? OPTION_DEFAULTS[OPTION_TYPE.INIT_RULE_DOCS];
    const pathRuleDoc = options?.pathRuleDoc ?? OPTION_DEFAULTS[OPTION_TYPE.PATH_RULE_DOC];
    const pathRuleList = stringOrArrayToArrayWithFallback(options?.pathRuleList, OPTION_DEFAULTS[OPTION_TYPE.PATH_RULE_LIST]);
    const postprocess = options?.postprocess ?? OPTION_DEFAULTS[OPTION_TYPE.POSTPROCESS];
    const ruleDocNotices = parseRuleDocNoticesOption(options?.ruleDocNotices);
    const ruleDocSectionExclude = stringOrArrayWithFallback(options?.ruleDocSectionExclude, OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_SECTION_EXCLUDE]);
    const ruleDocSectionInclude = stringOrArrayWithFallback(options?.ruleDocSectionInclude, OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_SECTION_INCLUDE]);
    const ruleDocSectionOptions = options?.ruleDocSectionOptions ??
        OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_SECTION_OPTIONS];
    const ruleDocTitleFormat = options?.ruleDocTitleFormat ??
        OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_TITLE_FORMAT];
    const ruleListColumns = parseRuleListColumnsOption(options?.ruleListColumns);
    const ruleListSplit = typeof options?.ruleListSplit === 'function'
        ? options.ruleListSplit
        : stringOrArrayToArrayWithFallback(options?.ruleListSplit, OPTION_DEFAULTS[OPTION_TYPE.RULE_LIST_SPLIT]);
    const urlConfigs = options?.urlConfigs ?? OPTION_DEFAULTS[OPTION_TYPE.URL_CONFIGS];
    const urlRuleDoc = options?.urlRuleDoc ?? OPTION_DEFAULTS[OPTION_TYPE.URL_RULE_DOC];
    // Gather normalized list of rules.
    const ruleNamesAndRules = Object.entries(plugin.rules)
        .map(([name, ruleModule]) => {
        // Convert deprecated function-style rules to object-style rules so that we don't have to handle function-style rules everywhere throughout the codebase.
        // @ts-expect-error -- this type unfortunately requires us to choose a `meta.type` even though the deprecated function-style rule won't have one.
        const ruleModuleAsObject = typeof ruleModule === 'function'
            ? {
                // Deprecated function-style rule don't support most of the properties that object-style rules support, so we'll just use the bare minimum.
                meta: {
                    // @ts-expect-error -- type is missing for this property
                    schema: ruleModule.schema, // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- type is missing for this property
                    // @ts-expect-error -- type is missing for this property
                    deprecated: ruleModule.deprecated, // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- type is missing for this property
                },
                create: ruleModule,
            }
            : ruleModule;
        const tuple = [name, ruleModuleAsObject];
        return tuple;
    })
        .filter(
    // Filter out deprecated rules from being checked, displayed, or updated if the option is set.
    ([, rule]) => !ignoreDeprecatedRules || !rule.meta?.deprecated)
        .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));
    // Update rule doc for each rule.
    let initializedRuleDoc = false;
    for (const [name, rule] of ruleNamesAndRules) {
        const schema = rule.meta?.schema;
        const description = rule.meta?.docs?.description;
        const pathToDoc = join(path, replaceRulePlaceholder(pathRuleDoc, name));
        const ruleHasOptions = hasOptions(schema);
        if (!existsSync(pathToDoc)) {
            if (!initRuleDocs) {
                throw new Error(`Could not find rule doc (run with --init-rule-docs to create): ${relative(getPluginRoot(path), pathToDoc)}`);
            }
            // Determine content for fresh rule doc, including any mandatory sections.
            // The rule doc header will be added later.
            let newRuleDocContents = [
                ruleDocSectionInclude.length > 0
                    ? ruleDocSectionInclude
                        .map((title) => `## ${title}`)
                        .join(`${EOL}${EOL}`)
                    : undefined,
                ruleHasOptions
                    ? `## Options${EOL}${EOL}${BEGIN_RULE_OPTIONS_LIST_MARKER}${EOL}${END_RULE_OPTIONS_LIST_MARKER}`
                    : undefined,
            ]
                .filter((section) => section !== undefined)
                .join(`${EOL}${EOL}`);
            if (newRuleDocContents !== '') {
                newRuleDocContents = `${EOL}${newRuleDocContents}${EOL}`;
            }
            await mkdir(dirname(pathToDoc), { recursive: true });
            await writeFile(pathToDoc, newRuleDocContents);
            initializedRuleDoc = true;
        }
        // Regenerate the header (title/notices) of each rule doc.
        const newHeaderLines = generateRuleHeaderLines(description, name, plugin, configsToRules, pluginPrefix, path, pathRuleDoc, configEmojis, configFormat, ignoreConfig, ruleDocNotices, ruleDocTitleFormat, urlConfigs, urlRuleDoc);
        const contentsOld = (await readFile(pathToDoc)).toString(); // eslint-disable-line unicorn/no-await-expression-member
        const contentsNew = await postprocess(updateRuleOptionsList(replaceOrCreateHeader(contentsOld, newHeaderLines, END_RULE_HEADER_MARKER), rule), resolve(pathToDoc));
        if (check) {
            if (contentsNew !== contentsOld) {
                console.error(`Please run eslint-doc-generator. A rule doc is out-of-date: ${relative(getPluginRoot(path), pathToDoc)}`);
                console.error(diff(contentsNew, contentsOld, { expand: false }));
                process.exitCode = 1;
            }
        }
        else {
            await writeFile(pathToDoc, contentsNew);
        }
        // Check for potential issues with the rule doc.
        // Check for required sections.
        for (const section of ruleDocSectionInclude) {
            expectSectionHeaderOrFail(`\`${name}\` rule doc`, contentsNew, [section], true);
        }
        // Check for disallowed sections.
        for (const section of ruleDocSectionExclude) {
            expectSectionHeaderOrFail(`\`${name}\` rule doc`, contentsNew, [section], false);
        }
        if (ruleDocSectionOptions) {
            // Options section.
            expectSectionHeaderOrFail(`\`${name}\` rule doc`, contentsNew, ['Options', 'Config'], ruleHasOptions);
            for (const { name: namedOption } of getAllNamedOptions(schema)) {
                expectContentOrFail(`\`${name}\` rule doc`, 'rule option', contentsNew, namedOption, true); // Each rule option is mentioned.
            }
        }
    }
    if (initRuleDocs && !initializedRuleDoc) {
        throw new Error('--init-rule-docs was enabled, but no rule doc file needed to be created.');
    }
    for (const pathRuleListItem of pathRuleList) {
        // Find the exact filename.
        const pathToFile = await getPathWithExactFileNameCasing(join(path, pathRuleListItem));
        if (!pathToFile || !existsSync(pathToFile)) {
            throw new Error(`Could not find ${String(pathRuleList)} in ESLint plugin.`);
        }
        // Update the rules list in this file.
        const fileContents = await readFile(pathToFile, 'utf8');
        const fileContentsNew = await postprocess(updateConfigsList(updateRulesList(ruleNamesAndRules, fileContents, plugin, configsToRules, pluginPrefix, pathRuleDoc, pathToFile, path, configEmojis, configFormat, ignoreConfig, ruleListColumns, ruleListSplit, urlConfigs, urlRuleDoc), plugin, configsToRules, pluginPrefix, configEmojis, configFormat, ignoreConfig), resolve(pathToFile));
        if (check) {
            if (fileContentsNew !== fileContents) {
                console.error(`Please run eslint-doc-generator. The rules table in ${relative(getPluginRoot(path), pathToFile)} is out-of-date.`);
                console.error(diff(fileContentsNew, fileContents, { expand: false }));
                process.exitCode = 1;
            }
        }
        else {
            await writeFile(pathToFile, fileContentsNew, 'utf8');
        }
    }
}
