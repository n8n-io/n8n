import { BEGIN_RULE_OPTIONS_LIST_MARKER, END_RULE_OPTIONS_LIST_MARKER, } from './comment-markers.js';
import { markdownTable } from 'markdown-table';
import { getAllNamedOptions } from './rule-options.js';
import { getEndOfLine, sanitizeMarkdownTable } from './string.js';
const EOL = getEndOfLine();
export var COLUMN_TYPE;
(function (COLUMN_TYPE) {
    // Alphabetical order.
    COLUMN_TYPE["DEFAULT"] = "default";
    COLUMN_TYPE["DEPRECATED"] = "deprecated";
    COLUMN_TYPE["DESCRIPTION"] = "description";
    COLUMN_TYPE["ENUM"] = "enum";
    COLUMN_TYPE["NAME"] = "name";
    COLUMN_TYPE["REQUIRED"] = "required";
    COLUMN_TYPE["TYPE"] = "type";
})(COLUMN_TYPE || (COLUMN_TYPE = {}));
const HEADERS = {
    // Alphabetical order.
    [COLUMN_TYPE.DEFAULT]: 'Default',
    [COLUMN_TYPE.DEPRECATED]: 'Deprecated',
    [COLUMN_TYPE.DESCRIPTION]: 'Description',
    [COLUMN_TYPE.ENUM]: 'Choices',
    [COLUMN_TYPE.NAME]: 'Name',
    [COLUMN_TYPE.REQUIRED]: 'Required',
    [COLUMN_TYPE.TYPE]: 'Type',
};
const COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING = {
    // Object keys ordered in display order.
    // Object values indicate whether the column is displayed by default.
    [COLUMN_TYPE.NAME]: true,
    [COLUMN_TYPE.DESCRIPTION]: true,
    [COLUMN_TYPE.TYPE]: true,
    [COLUMN_TYPE.ENUM]: true,
    [COLUMN_TYPE.DEFAULT]: true,
    [COLUMN_TYPE.REQUIRED]: true,
    [COLUMN_TYPE.DEPRECATED]: true,
};
/**
 * Output could look like:
 * - `[]`
 * - [`hello world`, `1`, `2`, `true`]
 */
function arrayToString(arr) {
    return `${arr.length === 0 ? '`' : ''}[${arr.length > 0 ? '`' : ''}${arr.join('`, `')}${arr.length > 0 ? '`' : ''}]${arr.length === 0 ? '`' : ''}`;
}
function ruleOptionToColumnValues(ruleOption) {
    const columns = {
        // Alphabetical order.
        [COLUMN_TYPE.DEFAULT]: ruleOption.default === undefined
            ? undefined
            : Array.isArray(ruleOption.default)
                ? arrayToString(ruleOption.default)
                : `\`${String(ruleOption.default)}\``, // eslint-disable-line @typescript-eslint/no-base-to-string
        [COLUMN_TYPE.DEPRECATED]: ruleOption.deprecated ? 'Yes' : undefined,
        [COLUMN_TYPE.DESCRIPTION]: ruleOption.description,
        [COLUMN_TYPE.ENUM]: ruleOption.enum && ruleOption.enum.length > 0
            ? `\`${ruleOption.enum.join('`, `')}\`` // eslint-disable-line @typescript-eslint/no-base-to-string
            : undefined,
        [COLUMN_TYPE.NAME]: `\`${ruleOption.name}\``,
        [COLUMN_TYPE.REQUIRED]: ruleOption.required ? 'Yes' : undefined,
        [COLUMN_TYPE.TYPE]: ruleOption.type || undefined,
    };
    return columns;
}
function ruleOptionsToColumnsToDisplay(ruleOptions) {
    const columnsToDisplay = {
        // Alphabetical order.
        [COLUMN_TYPE.DEFAULT]: ruleOptions.some((ruleOption) => ruleOption.default !== undefined),
        [COLUMN_TYPE.DEPRECATED]: ruleOptions.some((ruleOption) => ruleOption.deprecated),
        [COLUMN_TYPE.DESCRIPTION]: ruleOptions.some((ruleOption) => ruleOption.description),
        [COLUMN_TYPE.ENUM]: ruleOptions.some((ruleOption) => ruleOption.enum),
        [COLUMN_TYPE.NAME]: true,
        [COLUMN_TYPE.REQUIRED]: ruleOptions.some((ruleOption) => ruleOption.required),
        [COLUMN_TYPE.TYPE]: ruleOptions.some((ruleOption) => ruleOption.type),
    };
    return columnsToDisplay;
}
function generateRuleOptionsListMarkdown(rule) {
    const ruleOptions = getAllNamedOptions(rule.meta?.schema);
    if (ruleOptions.length === 0) {
        return '';
    }
    const columnsToDisplay = ruleOptionsToColumnsToDisplay(ruleOptions);
    const listHeaderRow = Object.keys(COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
        .filter((type) => columnsToDisplay[type])
        .map((type) => HEADERS[type]);
    const rows = [...ruleOptions]
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        .map((ruleOption) => {
        const ruleOptionColumnValues = ruleOptionToColumnValues(ruleOption);
        // Recreate object using correct ordering and presence of columns.
        return Object.keys(COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
            .filter((type) => columnsToDisplay[type])
            .map((type) => ruleOptionColumnValues[type] || '');
    });
    return markdownTable(sanitizeMarkdownTable([listHeaderRow, ...rows]), { align: 'l' });
}
export function updateRuleOptionsList(markdown, rule) {
    const listStartIndex = markdown.indexOf(BEGIN_RULE_OPTIONS_LIST_MARKER);
    let listEndIndex = markdown.indexOf(END_RULE_OPTIONS_LIST_MARKER);
    if (listStartIndex === -1 || listEndIndex === -1) {
        // No rule options list found.
        return markdown;
    }
    // Account for length of pre-existing marker.
    listEndIndex += END_RULE_OPTIONS_LIST_MARKER.length;
    const preList = markdown.slice(0, Math.max(0, listStartIndex));
    const postList = markdown.slice(Math.max(0, listEndIndex));
    // New rule options list.
    const list = generateRuleOptionsListMarkdown(rule);
    return `${preList}${BEGIN_RULE_OPTIONS_LIST_MARKER}${EOL}${EOL}${list}${EOL}${EOL}${END_RULE_OPTIONS_LIST_MARKER}${postList}`;
}
