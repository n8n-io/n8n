import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { getAllNamedOptions, hasOptions } from './rule-options.js';
import { getPluginRoot, getPathWithExactFileNameCasing, } from './package-json.js';
import { updateRulesList } from './rule-list.js';
import { updateConfigsList } from './config-list.js';
import { generateRuleHeaderLines } from './rule-doc-notices.js';
import { BEGIN_RULE_OPTIONS_LIST_MARKER, END_RULE_HEADER_MARKER, END_RULE_OPTIONS_LIST_MARKER, } from './comment-markers.js';
import { replaceOrCreateHeader, expectContentOrFail, expectSectionHeaderOrFail, } from './markdown.js';
import { diff } from 'jest-diff';
import { replaceRulePlaceholder } from './rule-link.js';
import { updateRuleOptionsList } from './rule-options-list.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getContext } from './context.js';
// eslint-disable-next-line complexity
export async function generate(path, userOptions) {
    const context = await getContext(path, userOptions);
    const { endOfLine, options, plugin } = context;
    // Destructure options that are only used in this function. Other options are passed around using
    // the "context" object.
    const { check, ignoreDeprecatedRules, initRuleDocs, pathRuleDoc, pathRuleList, postprocess, ruleDocSectionExclude, ruleDocSectionInclude, ruleDocSectionOptions, } = options;
    if (!plugin.rules) {
        throw new Error('Could not find exported `rules` object in ESLint plugin.');
    }
    // Gather the normalized list of rules.
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
        const pathCurrentPage = replaceRulePlaceholder(pathRuleDoc, name);
        const pathToDoc = join(path, pathCurrentPage);
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
                        .join(`${endOfLine}${endOfLine}`)
                    : undefined,
                ruleHasOptions
                    ? `## Options${endOfLine}${endOfLine}${BEGIN_RULE_OPTIONS_LIST_MARKER}${endOfLine}${END_RULE_OPTIONS_LIST_MARKER}`
                    : undefined,
            ]
                .filter((section) => section !== undefined)
                .join(`${endOfLine}${endOfLine}`);
            if (newRuleDocContents !== '') {
                newRuleDocContents = `${endOfLine}${newRuleDocContents}${endOfLine}`;
            }
            await mkdir(dirname(pathToDoc), { recursive: true });
            await writeFile(pathToDoc, newRuleDocContents);
            initializedRuleDoc = true;
        }
        // Regenerate the header (title/notices) of each rule doc.
        const newHeaderLines = generateRuleHeaderLines(context, description, name);
        const contentsOldBuffer = await readFile(pathToDoc);
        const contentsOld = contentsOldBuffer.toString();
        const contentsNew = await postprocess(updateRuleOptionsList(context, replaceOrCreateHeader(context, contentsOld, newHeaderLines, END_RULE_HEADER_MARKER), rule), resolve(pathToDoc));
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
            expectSectionHeaderOrFail(context, `\`${name}\` rule doc`, contentsNew, [section], true);
        }
        // Check for disallowed sections.
        for (const section of ruleDocSectionExclude) {
            expectSectionHeaderOrFail(context, `\`${name}\` rule doc`, contentsNew, [section], false);
        }
        if (ruleDocSectionOptions) {
            // Options section.
            expectSectionHeaderOrFail(context, `\`${name}\` rule doc`, contentsNew, ['Options', 'Config'], ruleHasOptions);
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
        const rulesList = updateRulesList(context, ruleNamesAndRules, fileContents, pathToFile);
        const fileContentsNew = await postprocess(updateConfigsList(context, rulesList), resolve(pathToFile));
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
