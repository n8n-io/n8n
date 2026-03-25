import type { Faker } from '../../..';
/**
 * Module to generate links to images on `https://via.placeholder.com/`.
 *
 * The images generated from this module are fetched from an external service outside the control of Faker and could occasionally contain URLs which are broken or point to unexpected, disturbing, or offensive images. The service may also be subject to usage limits.
 *
 * @deprecated Use `faker.image.urlPlaceholder` instead.
 */
export declare class Placeholder {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Generates a new placeholder image url.
     *
     * These images are fetched from an external service outside the control of Faker and could occasionally contain URLs which point to unexpected, disturbing, or offensive images. Usage limits may contribute to this behavior.
     *
     * @param width The width of the image (in pixels). Defaults to `640`.
     * @param height The height of the image (in pixels). Defaults to `width`.
     * @param text The text of the image.
     * @param format The file format of the image. Supports `png`, `jpeg`, `png`, `gif`, `webp`.
     * @param backgroundColor The background color of the placeholder. Supports HEX CODE format.
     * @param textColor The text color of the placeholder. Requires `backgroundColor`. Supports HEX CODE format.
     *
     * @example
     * faker.image.placeholder.imageUrl() // https://via.placeholder.com/640x640
     * faker.image.placeholder.imageUrl(200) // https://via.placeholder.com/200x200
     * faker.image.placeholder.imageUrl(200, 100) // https://via.placeholder.com/200x100
     * faker.image.placeholder.imageUrl(200, 100, 'Fish') // https://via.placeholder.com/200x100?text=Fish
     * faker.image.placeholder.imageUrl(200, 100, 'Fish', 'webp') // https://via.placeholder.com/200x100.webp?text=Fish
     * faker.image.placeholder.imageUrl(200, 100, 'Fish', 'webp') // https://via.placeholder.com/200x100.webp?text=Fish
     * faker.image.placeholder.imageUrl(200, 100, 'Fish', 'webp', '000000', 'ffffff) // https://via.placeholder.com/200x100/000000/FFFFFF.webp?text=Fish
     *
     * @deprecated Use `faker.image.urlPlaceholder` instead.
     */
    imageUrl(width?: number, height?: number, text?: string, format?: 'png' | 'jpeg' | 'jpg' | 'gif' | 'webp', backgroundColor?: string, textColor?: string): string;
    /**
     * Generate a new placeholder image with random colors and text.
     *
     * These images are fetched from an external service outside the control of Faker and could occasionally contain URLs which point to unexpected, disturbing, or offensive images. Usage limits may contribute to this behavior.
     *
     * @param width The width of the image (in pixels). Defaults to `640`.
     * @param height The height of the image (in pixels). Defaults to `width`.
     * @param format The file format of the image. Supports `png` `jpeg` `png` `gif` `webp`.
     *
     * @example
     * faker.image.placeholder.randomUrl() // https://via.placeholder.com/640x640/000000/ffffff?text=lorum
     * faker.image.placeholder.randomUrl(150) // https://via.placeholder.com/150x150/000000/ffffff?text=lorum
     * faker.image.placeholder.randomUrl(150, 200) // https://via.placeholder.com/150x200/000000/ffffff?text=lorum
     * faker.image.placeholder.randomUrl(150, 200, 'png') // https://via.placeholder.com/150x200/000000/ffffff.png?text=lorum
     *
     * @deprecated Use `faker.image.urlPlaceholder` instead.
     */
    randomUrl(width?: number, height?: number, format?: 'png' | 'jpeg' | 'jpg' | 'gif' | 'webp'): string;
}
