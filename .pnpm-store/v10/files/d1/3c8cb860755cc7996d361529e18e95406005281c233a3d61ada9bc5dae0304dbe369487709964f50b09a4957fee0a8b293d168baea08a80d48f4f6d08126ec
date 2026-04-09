import type { Faker } from '../..';
import { LoremPicsum } from './providers/lorempicsum';
import { Lorempixel } from './providers/lorempixel';
import { Placeholder } from './providers/placeholder';
import { Unsplash } from './providers/unsplash';
/**
 * Module to generate placeholder images.
 *
 * Default provider is unsplash image provider.
 */
export declare class ImageModule {
    private readonly faker;
    readonly lorempixel: Lorempixel;
    readonly unsplash: Unsplash;
    readonly lorempicsum: LoremPicsum;
    readonly placeholder: Placeholder;
    constructor(faker: Faker);
    /**
     * Generates a random image url from one of the supported categories.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.image() // 'https://loremflickr.com/640/480/city'
     * faker.image.image(1234, 2345) // 'https://loremflickr.com/1234/2345/sports'
     * faker.image.image(1234, 2345, true) // 'https://loremflickr.com/1234/2345/nature?lock=56789'
     *
     * @since 2.0.1
     */
    image(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random avatar image url.
     *
     * @example
     * faker.image.avatar()
     * // 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/170.jpg'
     *
     * @since 2.0.1
     */
    avatar(): string;
    /**
     * Generates a random image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param category The category of the image. By default, a random one will be selected.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.imageUrl() // 'https://loremflickr.com/640/480'
     * faker.image.imageUrl(1234, 2345) // 'https://loremflickr.com/1234/2345'
     * faker.image.imageUrl(1234, 2345, 'cat') // 'https://loremflickr.com/1234/2345/cat'
     * faker.image.imageUrl(1234, 2345, 'cat', true) // 'https://loremflickr.com/1234/2345/cat?lock=6849'
     *
     * @since 2.0.1
     */
    imageUrl(width?: number, height?: number, category?: string, randomize?: boolean): string;
    /**
     * Generates a random abstract image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.abstract() // 'https://loremflickr.com/640/480/abstract'
     * faker.image.abstract(1234, 2345) // 'https://loremflickr.com/1234/2345/abstract'
     * faker.image.abstract(1234, 2345, true) // 'https://loremflickr.com/1234/2345/abstract?lock=56789'
     *
     * @since 2.0.1
     */
    abstract(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random animal image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.animals() // 'https://loremflickr.com/640/480/animals'
     * faker.image.animals(1234, 2345) // 'https://loremflickr.com/1234/2345/animals'
     * faker.image.animals(1234, 2345, true) // 'https://loremflickr.com/1234/2345/animals?lock=56789'
     *
     * @since 2.0.1
     */
    animals(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random business image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.business() // 'https://loremflickr.com/640/480/business'
     * faker.image.business(1234, 2345) // 'https://loremflickr.com/1234/2345/business'
     * faker.image.business(1234, 2345, true) // 'https://loremflickr.com/1234/2345/business?lock=56789'
     *
     * @since 2.0.1
     */
    business(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random cat image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.cats() // 'https://loremflickr.com/640/480/cats'
     * faker.image.cats(1234, 2345) // 'https://loremflickr.com/1234/2345/cats'
     * faker.image.cats(1234, 2345, true) // 'https://loremflickr.com/1234/2345/cats?lock=56789'
     *
     * @since 2.0.1
     */
    cats(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random city image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.city() // 'https://loremflickr.com/640/480/city'
     * faker.image.city(1234, 2345) // 'https://loremflickr.com/1234/2345/city'
     * faker.image.city(1234, 2345, true) // 'https://loremflickr.com/1234/2345/city?lock=56789'
     *
     * @since 2.0.1
     */
    city(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random food image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.food() // 'https://loremflickr.com/640/480/food'
     * faker.image.food(1234, 2345) // 'https://loremflickr.com/1234/2345/food'
     * faker.image.food(1234, 2345, true) // 'https://loremflickr.com/1234/2345/food?lock=56789'
     *
     * @since 2.0.1
     */
    food(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random nightlife image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.nightlife() // 'https://loremflickr.com/640/480/nightlife'
     * faker.image.nightlife(1234, 2345) // 'https://loremflickr.com/1234/2345/nightlife'
     * faker.image.nightlife(1234, 2345, true) // 'https://loremflickr.com/1234/2345/nightlife?lock=56789'
     *
     * @since 2.0.1
     */
    nightlife(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random fashion image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.fashion() // 'https://loremflickr.com/640/480/fashion'
     * faker.image.fashion(1234, 2345) // 'https://loremflickr.com/1234/2345/fashion'
     * faker.image.fashion(1234, 2345, true) // 'https://loremflickr.com/1234/2345/fashion?lock=56789'
     *
     * @since 2.0.1
     */
    fashion(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random people image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.people() // 'https://loremflickr.com/640/480/people'
     * faker.image.people(1234, 2345) // 'https://loremflickr.com/1234/2345/people'
     * faker.image.people(1234, 2345, true) // 'https://loremflickr.com/1234/2345/people?lock=56789'
     *
     * @since 2.0.1
     */
    people(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random nature image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.nature() // 'https://loremflickr.com/640/480/nature'
     * faker.image.nature(1234, 2345) // 'https://loremflickr.com/1234/2345/nature'
     * faker.image.nature(1234, 2345, true) // 'https://loremflickr.com/1234/2345/nature?lock=56789'
     *
     * @since 2.0.1
     */
    nature(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random sports image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.sports() // 'https://loremflickr.com/640/480/sports'
     * faker.image.sports(1234, 2345) // 'https://loremflickr.com/1234/2345/sports'
     * faker.image.sports(1234, 2345, true) // 'https://loremflickr.com/1234/2345/sports?lock=56789'
     *
     * @since 2.0.1
     */
    sports(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random technics image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.technics() // 'https://loremflickr.com/640/480/technics'
     * faker.image.technics(1234, 2345) // 'https://loremflickr.com/1234/2345/technics'
     * faker.image.technics(1234, 2345, true) // 'https://loremflickr.com/1234/2345/technics?lock=56789'
     *
     * @since 2.0.1
     */
    technics(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random transport image url.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param randomize Whether to randomize the image or not. Defaults to `false`.
     *
     * @example
     * faker.image.transport() // 'https://loremflickr.com/640/480/transport'
     * faker.image.transport(1234, 2345) // 'https://loremflickr.com/1234/2345/transport'
     * faker.image.transport(1234, 2345, true) // 'https://loremflickr.com/1234/2345/transport?lock=56789'
     *
     * @since 2.0.1
     */
    transport(width?: number, height?: number, randomize?: boolean): string;
    /**
     * Generates a random data uri containing an svg image.
     *
     * @param width The width of the image. Defaults to `640`.
     * @param height The height of the image. Defaults to `480`.
     * @param color The color to use. Defaults to `grey`.
     *
     * @example
     * faker.image.dataUri() // 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http...'
     *
     * @since 4.0.0
     */
    dataUri(width?: number, height?: number, color?: string): string;
}
