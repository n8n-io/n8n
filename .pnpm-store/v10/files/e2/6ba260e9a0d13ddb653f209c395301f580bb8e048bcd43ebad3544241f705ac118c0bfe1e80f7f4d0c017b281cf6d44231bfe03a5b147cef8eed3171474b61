import type { AirlineDefinition } from './airline';
import type { AnimalDefinition } from './animal';
import type { ColorDefinition } from './color';
import type { CommerceDefinition } from './commerce';
import type { CompanyDefinition } from './company';
import type { DatabaseDefinition } from './database';
import type { DateDefinition } from './date';
import type { FinanceDefinition } from './finance';
import type { HackerDefinition } from './hacker';
import type { InternetDefinition } from './internet';
import type { LocationDefinition } from './location';
import type { LoremDefinition } from './lorem';
import type { MetadataDefinition } from './metadata';
import type { MusicDefinition } from './music';
import type { PersonDefinition } from './person';
import type { PhoneNumberDefinition } from './phone_number';
import type { ScienceDefinition } from './science';
import type { SystemDefinition } from './system';
import type { VehicleDefinition } from './vehicle';
import type { WordDefinition } from './word';
/**
 * Wrapper type for all definition categories that will make all properties optional and allow extra properties.
 */
export type LocaleEntry<TCategoryDefinition extends Record<string, unknown>> = {
    [P in keyof TCategoryDefinition]?: TCategoryDefinition[P] | null;
} & Record<string, unknown>;
/**
 * The definitions as used by the translations/locales.
 */
export type LocaleDefinition = {
    metadata?: MetadataDefinition;
    airline?: AirlineDefinition;
    animal?: AnimalDefinition;
    color?: ColorDefinition;
    commerce?: CommerceDefinition;
    company?: CompanyDefinition;
    database?: DatabaseDefinition;
    date?: DateDefinition;
    finance?: FinanceDefinition;
    hacker?: HackerDefinition;
    internet?: InternetDefinition;
    location?: LocationDefinition;
    lorem?: LoremDefinition;
    music?: MusicDefinition;
    person?: PersonDefinition;
    phone_number?: PhoneNumberDefinition;
    science?: ScienceDefinition;
    system?: SystemDefinition;
    vehicle?: VehicleDefinition;
    word?: WordDefinition;
} & Record<string, Record<string, unknown>>;
