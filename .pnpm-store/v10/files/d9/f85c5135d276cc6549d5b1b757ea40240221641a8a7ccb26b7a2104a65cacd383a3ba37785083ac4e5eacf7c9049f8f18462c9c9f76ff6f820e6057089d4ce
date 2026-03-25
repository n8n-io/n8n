import { getEndOfLine } from './string.js';
// General helpers for dealing with markdown files / content.
/**
 * Replace the header of a doc up to and including the specified marker.
 * Insert at beginning if header doesn't exist.
 * @param markdown - doc content
 * @param newHeader - new header including marker
 * @param marker - marker to indicate end of header
 */
export function replaceOrCreateHeader(markdown, newHeader, marker) {
    const EOL = getEndOfLine();
    const lines = markdown.split(EOL);
    const titleLineIndex = lines.findIndex((line) => line.startsWith('# '));
    const markerLineIndex = lines.indexOf(marker);
    const dashesLineIndex1 = lines.indexOf('---');
    const dashesLineIndex2 = lines.indexOf('---', dashesLineIndex1 + 1);
    // Any YAML front matter or anything else above the title should be kept as-is ahead of the new header.
    const preHeader = lines
        .slice(0, Math.max(titleLineIndex, dashesLineIndex2 + 1))
        .join(EOL);
    // Anything after the marker comment, title, or YAML front matter should be kept as-is after the new header.
    const postHeader = lines
        .slice(Math.max(markerLineIndex + 1, titleLineIndex + 1, dashesLineIndex2 + 1))
        .join(EOL);
    return `${preHeader ? `${preHeader}${EOL}` : ''}${newHeader}${EOL}${postHeader}`;
}
/**
 * Find the section most likely to be the top-level section for a given string.
 */
export function findSectionHeader(markdown, str) {
    const EOL = getEndOfLine();
    // Get all the matching strings.
    const regexp = new RegExp(`## .*${str}.*${EOL}`, 'giu');
    const sectionPotentialMatches = [...markdown.matchAll(regexp)].map((match) => match[0]);
    if (sectionPotentialMatches.length === 0) {
        // No section found.
        return undefined;
    }
    if (sectionPotentialMatches.length === 1) {
        // If there's only one match, we can assume it's the section.
        return sectionPotentialMatches[0];
    }
    // Otherwise assume the shortest match is the correct one.
    return sectionPotentialMatches.sort((a, b) => a.length - b.length)[0];
}
export function findFinalHeaderLevel(str) {
    const EOL = getEndOfLine();
    const lines = str.split(EOL);
    const finalHeader = lines.reverse().find((line) => line.match('^(#+) .+$'));
    return finalHeader ? finalHeader.indexOf(' ') : undefined;
}
/**
 * Ensure a doc contains (or doesn't contain) some particular content.
 * Upon failure, output the failure and set a failure exit code.
 * @param docName - name of doc for error message
 * @param contentName - name of content for error message
 * @param contents - the doc's contents
 * @param content - the content we are checking for
 * @param expected - whether the content should be present or not present
 */
export function expectContentOrFail(docName, contentName, contents, content, expected) {
    // Check for the content and also the versions of the content with escaped quotes
    // in case escaping is needed where the content is referenced.
    const hasContent = contents.includes(content) ||
        contents.includes(content.replaceAll('"', String.raw `\"`)) ||
        contents.includes(content.replaceAll("'", String.raw `\'`));
    if (hasContent !== expected) {
        console.error(`${docName} should ${
        /* istanbul ignore next -- TODO: test !expected or remove parameter */
        expected ? '' : 'not '}have included ${contentName}: ${content}`);
        process.exitCode = 1;
    }
}
export function expectSectionHeaderOrFail(contentName, contents, possibleHeaders, expected) {
    const found = possibleHeaders.some((header) => findSectionHeader(contents, header));
    if (found !== expected) {
        if (possibleHeaders.length > 1) {
            console.error(`${contentName} should ${expected ? '' : 'not '}have included ${expected ? 'one' : 'any'} of these headers: ${possibleHeaders.join(', ')}`);
        }
        else {
            console.error(`${contentName} should ${expected ? '' : 'not '}have included the header: ${possibleHeaders.join(', ')}`);
        }
        process.exitCode = 1;
    }
}
