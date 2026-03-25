export interface Options {
    /**
     * Additional folders to search for fonts. Default: []
     */
    additionalFolders?: string[];
    /**
     * File extensions to search for. Default: ['ttf', 'otf', 'ttc', 'woff', 'woff2']
     */
    extensions?: string[];
}
/**
 * List absolute paths to all installed system fonts present.
 *
 * @param options Configuration options
 */
declare function getSystemFonts(options?: Options): Promise<string[]>;
export default getSystemFonts;
