import type { AddressDefinitions } from './address';
import type { AnimalDefinitions } from './animal';
import type { ColorDefinitions } from './color';
import type { CommerceDefinitions } from './commerce';
import type { CompanyDefinitions } from './company';
import type { DatabaseDefinitions } from './database';
import type { DateDefinitions } from './date';
import type { FinanceDefinitions } from './finance';
import type { HackerDefinitions } from './hacker';
import type { InternetDefinitions } from './internet';
import type { LoremDefinitions } from './lorem';
import type { MusicDefinitions } from './music';
import type { NameDefinitions } from './name';
import type { PhoneNumberDefinitions } from './phone_number';
import type { ScienceDefinitions } from './science';
import type { SystemDefinitions } from './system';
import type { VehicleDefinitions } from './vehicle';
import type { WordDefinitions } from './word';
export declare type LocaleEntry<T> = Partial<T> & Record<string, any>;
/**
 * The definitions as used by the Faker modules.
 */
export interface Definitions {
    address: AddressDefinitions;
    animal: AnimalDefinitions;
    color: ColorDefinitions;
    commerce: CommerceDefinitions;
    company: CompanyDefinitions;
    database: DatabaseDefinitions;
    date: DateDefinitions;
    finance: FinanceDefinitions;
    hacker: HackerDefinitions;
    internet: InternetDefinitions;
    lorem: LoremDefinitions;
    music: MusicDefinitions;
    name: NameDefinitions;
    phone_number: PhoneNumberDefinitions;
    science: ScienceDefinitions;
    system: SystemDefinitions;
    vehicle: VehicleDefinitions;
    word: WordDefinitions;
}
/**
 * The definitions as used by the translations/locales.
 * This is basically the same as Definitions with the exception,
 * that most properties are optional and extra properties are allowed.
 */
export declare type LocaleDefinition = {
    /**
     * The name of the language.
     */
    title: string;
    separator?: string;
} & LocaleEntry<Definitions>;
