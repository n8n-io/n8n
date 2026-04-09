export function toSentenceCase(str) {
    return str.replace(/^\w/u, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    });
}
export function addTrailingPeriod(str) {
    return str.replace(/\.?$/u, '.');
}
export function removeTrailingPeriod(str) {
    return str.replace(/\.$/u, '');
}
/**
 * Example: FOO => Foo, foo => Foo
 */
export function capitalizeOnlyFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function sanitizeMarkdownTableCell(context, text) {
    const { endOfLine } = context;
    return text
        .replaceAll('|', String.raw `\|`)
        .replaceAll(new RegExp(endOfLine, 'gu'), '<br/>');
}
export function sanitizeMarkdownTable(context, text) {
    return text.map((row) => row.map((col) => sanitizeMarkdownTableCell(context, col)));
}
