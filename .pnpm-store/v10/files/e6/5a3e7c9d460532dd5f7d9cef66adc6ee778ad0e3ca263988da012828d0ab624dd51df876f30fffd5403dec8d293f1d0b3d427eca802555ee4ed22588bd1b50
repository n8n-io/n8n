import { RRule } from './rrule';
import { RRuleSet } from './rruleset';
import { Options } from './types';
export interface RRuleStrOptions {
    dtstart: Date | null;
    cache: boolean;
    unfold: boolean;
    forceset: boolean;
    compatible: boolean;
    tzid: string | null;
}
export declare function parseInput(s: string, options: Partial<RRuleStrOptions>): {
    dtstart: Date;
    tzid: string;
    rrulevals: Partial<Options>[];
    rdatevals: Date[];
    exrulevals: Partial<Options>[];
    exdatevals: Date[];
};
export declare function rrulestr(s: string, options?: Partial<RRuleStrOptions>): RRule | RRuleSet;
//# sourceMappingURL=rrulestr.d.ts.map