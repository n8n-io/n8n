import type { LocaleDefinition } from './definitions';
import type { KnownLocale } from './locales';
import { AddressModule } from './modules/address';
import { AnimalModule } from './modules/animal';
import { ColorModule } from './modules/color';
import { CommerceModule } from './modules/commerce';
import { CompanyModule } from './modules/company';
import { DatabaseModule } from './modules/database';
import { DatatypeModule } from './modules/datatype';
import { DateModule } from './modules/date';
import { FakeModule } from './modules/fake';
import { FinanceModule } from './modules/finance';
import { GitModule } from './modules/git';
import { HackerModule } from './modules/hacker';
import { HelpersModule } from './modules/helpers';
import { ImageModule } from './modules/image';
import { InternetModule } from './modules/internet';
import { LoremModule } from './modules/lorem';
import { MersenneModule } from './modules/mersenne';
import { MusicModule } from './modules/music';
import { NameModule } from './modules/name';
import { PhoneModule } from './modules/phone';
import { RandomModule } from './modules/random';
import { ScienceModule } from './modules/science';
import { SystemModule } from './modules/system';
import { UniqueModule } from './modules/unique';
import { VehicleModule } from './modules/vehicle';
import { WordModule } from './modules/word';
import type { LiteralUnion } from './utils/types';
export declare type UsableLocale = LiteralUnion<KnownLocale>;
export declare type UsedLocales = Partial<Record<UsableLocale, LocaleDefinition>>;
export interface FakerOptions {
    locales: UsedLocales;
    locale?: UsableLocale;
    localeFallback?: UsableLocale;
}
export declare class Faker {
    locales: UsedLocales;
    private _locale;
    private _localeFallback;
    get locale(): UsableLocale;
    set locale(locale: UsableLocale);
    get localeFallback(): UsableLocale;
    set localeFallback(localeFallback: UsableLocale);
    readonly definitions: LocaleDefinition;
    readonly fake: FakeModule['fake'];
    readonly unique: UniqueModule['unique'];
    /**
     * @deprecated Internal. Use faker.datatype.number() or faker.seed() instead.
     */
    readonly mersenne: MersenneModule;
    readonly random: RandomModule;
    readonly helpers: HelpersModule;
    readonly datatype: DatatypeModule;
    readonly address: AddressModule;
    readonly animal: AnimalModule;
    readonly color: ColorModule;
    readonly commerce: CommerceModule;
    readonly company: CompanyModule;
    readonly database: DatabaseModule;
    readonly date: DateModule;
    readonly finance: FinanceModule;
    readonly git: GitModule;
    readonly hacker: HackerModule;
    readonly image: ImageModule;
    readonly internet: InternetModule;
    readonly lorem: LoremModule;
    readonly music: MusicModule;
    readonly name: NameModule;
    readonly phone: PhoneModule;
    readonly science: ScienceModule;
    readonly system: SystemModule;
    readonly vehicle: VehicleModule;
    readonly word: WordModule;
    constructor(opts: FakerOptions);
    /**
     * Creates a Proxy based LocaleDefinition that virtually merges the locales.
     */
    private initDefinitions;
    /**
     * Sets the seed or generates a new one.
     *
     * Please note that generated values are dependent on both the seed and the
     * number of calls that have been made since it was set.
     *
     * This method is intended to allow for consistent values in a tests, so you
     * might want to use hardcoded values as the seed.
     *
     * In addition to that it can be used for creating truly random tests
     * (by passing no arguments), that still can be reproduced if needed,
     * by logging the result and explicitly setting it if needed.
     *
     * @param seed The seed to use. Defaults to a random number.
     * @returns The seed that was set.
     *
     * @example
     * // Consistent values for tests:
     * faker.seed(42)
     * faker.datatype.number(10); // 4
     * faker.datatype.number(10); // 8
     *
     * faker.seed(42)
     * faker.datatype.number(10); // 4
     * faker.datatype.number(10); // 8
     *
     * @example
     * // Random but reproducible tests:
     * // Simply log the seed, and if you need to reproduce it, insert the seed here
     * console.log('Running test with seed:', faker.seed());
     */
    seed(seed?: number): number;
    /**
     * Sets the seed array.
     *
     * Please note that generated values are dependent on both the seed and the
     * number of calls that have been made since it was set.
     *
     * This method is intended to allow for consistent values in a tests, so you
     * might want to use hardcoded values as the seed.
     *
     * In addition to that it can be used for creating truly random tests
     * (by passing no arguments), that still can be reproduced if needed,
     * by logging the result and explicitly setting it if needed.
     *
     * @param seedArray The seed array to use.
     * @returns The seed array that was set.
     *
     * @example
     * // Consistent values for tests:
     * faker.seed([42, 13, 17])
     * faker.datatype.number(10); // 4
     * faker.datatype.number(10); // 8
     *
     * faker.seed([42, 13, 17])
     * faker.datatype.number(10); // 4
     * faker.datatype.number(10); // 8
     *
     * @example
     * // Random but reproducible tests:
     * // Simply log the seed, and if you need to reproduce it, insert the seed here
     * console.log('Running test with seed:', faker.seed());
     */
    seed(seedArray: number[]): number[];
    /**
     * Set Faker's locale
     *
     * @param locale The locale to set (e.g. `en` or `en_AU`, `en_AU_ocker`).
     */
    setLocale(locale: UsableLocale): void;
}
