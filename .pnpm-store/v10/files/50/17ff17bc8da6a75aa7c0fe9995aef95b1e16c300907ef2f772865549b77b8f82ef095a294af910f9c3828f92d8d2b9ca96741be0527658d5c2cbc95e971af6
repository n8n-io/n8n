import { IntervalArray, OptionReplaceArray, OptionReplaceCombined, OptionsTransliterate } from '../types';
import { Charmap } from '../../data/charmap';
export declare const defaultOptions: OptionsTransliterate;
export declare class Transliterate {
    protected confOptions: OptionsTransliterate;
    protected map: Charmap;
    get options(): OptionsTransliterate;
    constructor(confOptions?: OptionsTransliterate, map?: Charmap);
    /**
     * Set default config
     * @param options
     */
    config(options?: OptionsTransliterate, reset?: boolean): OptionsTransliterate;
    /**
     * Replace the source string using the code map
     * @param str
     * @param ignoreRanges
     * @param unknown
     */
    codeMapReplace(str: string, ignoreRanges: IntervalArray | undefined, opt: OptionsTransliterate): string;
    /**
     * Convert the object version of the 'replace' option into tuple array one
     * @param option replace option to be either an object or tuple array
     * @return return the paired array version of replace option
     */
    formatReplaceOption(option: OptionReplaceCombined): OptionReplaceArray;
    /**
     * Search and replace a list of strings(regexps) and return the result string
     * @param source Source string
     * @param searches Search-replace string(regexp) pairs
     */
    replaceString(source: string, searches: OptionReplaceArray, ignore?: string[]): string;
    /**
     * Set charmap data
     * @param {Charmap} [data]
     * @param {boolean} [reset=false]
     * @memberof Transliterate
     */
    setData(data?: Charmap, reset?: boolean): Charmap;
    /**
     * Main transliterate function
     * @param source The string which is being transliterated
     * @param options Options object
     */
    transliterate(source: string, options?: OptionsTransliterate): string;
}
