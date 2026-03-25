import type { LocaleEntry } from './definitions';
/**
 * The possible definitions related to people's names.
 */
export type PersonDefinition = LocaleEntry<{
    gender: string[];
    sex: string[];
    prefix: string[];
    female_prefix: string[];
    male_prefix: string[];
    first_name: string[];
    female_first_name: string[];
    male_first_name: string[];
    middle_name: string[];
    female_middle_name: string[];
    male_middle_name: string[];
    last_name: string[];
    female_last_name: string[];
    male_last_name: string[];
    suffix: string[];
    /**
     * A weighted list of patterns used to generate names.
     */
    name: Array<{
        value: string;
        weight: number;
    }>;
    /**
     * A weighted list of patterns used to generate last names.
     */
    last_name_pattern: Array<{
        value: string;
        weight: number;
    }>;
    male_last_name_pattern: Array<{
        value: string;
        weight: number;
    }>;
    female_last_name_pattern: Array<{
        value: string;
        weight: number;
    }>;
    bio_pattern: string[];
    title: PersonTitleDefinition;
    job_title_pattern: string[];
    western_zodiac_sign: string[];
}>;
/**
 * The possible definitions related to people's titles.
 */
export type PersonTitleDefinition = LocaleEntry<{
    descriptor: string[];
    job: string[];
    level: string[];
}>;
