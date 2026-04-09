import type { Faker } from '../../faker';
/**
 * Module to generate commerce and product related entries.
 */
export declare class CommerceModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Returns a human readable color name.
     *
     * @see faker.color.human()
     *
     * @example
     * faker.commerce.color() // 'red'
     *
     * @since 3.0.0
     *
     * @deprecated
     * Use `faker.color.human()` instead.
     */
    color(): string;
    /**
     * Returns a department inside a shop.
     *
     * @example
     * faker.commerce.department() // 'Garden'
     *
     * @since 3.0.0
     */
    department(): string;
    /**
     * Generates a random descriptive product name.
     *
     * @example
     * faker.commerce.productName() // 'Incredible Soft Gloves'
     *
     * @since 3.0.0
     */
    productName(): string;
    /**
     * Generates a price between min and max (inclusive).
     *
     * @param min The minimum price. Defaults to `1`.
     * @param max The maximum price. Defaults to `1000`.
     * @param dec The number of decimal places. Defaults to `2`.
     * @param symbol The currency value to use. Defaults to `''`.
     *
     * @example
     * faker.commerce.price() // 828.00
     * faker.commerce.price(100) // 904.00
     * faker.commerce.price(100, 200) // 154.00
     * faker.commerce.price(100, 200, 0) // 133
     * faker.commerce.price(100, 200, 0, '$') // $114
     *
     * @since 3.0.0
     */
    price(min?: number, max?: number, dec?: number, symbol?: string): string;
    /**
     * Returns an adjective describing a product.
     *
     * @example
     * faker.commerce.productAdjective() // 'Handcrafted'
     *
     * @since 3.0.0
     */
    productAdjective(): string;
    /**
     * Returns a material of a product.
     *
     * @example
     * faker.commerce.productMaterial() // 'Rubber'
     *
     * @since 3.0.0
     */
    productMaterial(): string;
    /**
     * Returns a short product name.
     *
     * @example
     * faker.commerce.product() // 'Computer'
     *
     * @since 3.0.0
     */
    product(): string;
    /**
     * Returns a product description.
     *
     * @example
     * faker.commerce.productDescription() // 'Andy shoes are designed to keeping...'
     *
     * @since 5.0.0
     */
    productDescription(): string;
}
