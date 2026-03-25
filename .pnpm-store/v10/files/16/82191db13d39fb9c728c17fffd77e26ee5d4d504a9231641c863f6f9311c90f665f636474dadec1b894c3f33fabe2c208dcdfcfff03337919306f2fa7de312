import { Pattern, MicromatchOptions, PatternRe } from '../../types';
import Settings from '../../settings';
export declare type PatternSegment = StaticPatternSegment | DynamicPatternSegment;
declare type StaticPatternSegment = {
    dynamic: false;
    pattern: Pattern;
};
declare type DynamicPatternSegment = {
    dynamic: true;
    pattern: Pattern;
    patternRe: PatternRe;
};
export declare type PatternSection = PatternSegment[];
export declare type PatternInfo = {
    /**
     * Indicates that the pattern has a globstar (more than a single section).
     */
    complete: boolean;
    pattern: Pattern;
    segments: PatternSegment[];
    sections: PatternSection[];
};
export default abstract class Matcher {
    private readonly _patterns;
    private readonly _settings;
    private readonly _micromatchOptions;
    protected readonly _storage: PatternInfo[];
    constructor(_patterns: Pattern[], _settings: Settings, _micromatchOptions: MicromatchOptions);
    private _fillStorage;
    private _getPatternSegments;
    private _splitSegmentsIntoSections;
}
export {};
