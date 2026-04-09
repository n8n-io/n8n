import type { Faker } from '../..';
/**
 * Generator method for combining faker methods based on string input.
 *
 * @deprecated
 */
export declare class FakeModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Generator for combining faker methods based on a static string input.
     *
     * Note: We recommend using string template literals instead of `fake()`,
     * which are faster and strongly typed (if you are using TypeScript),
     * e.g. ``const address = `${faker.address.zipCode()} ${faker.address.city()}`;``
     *
     * This method is useful if you have to build a random string from a static, non-executable source
     * (e.g. string coming from a user, stored in a database or a file).
     *
     * It checks the given string for placeholders and replaces them by calling faker methods:
     *
     * ```js
     * const hello = faker.fake('Hi, my name is {{name.firstName}} {{name.lastName}}!')
     * ```
     *
     * This would use the `faker.name.firstName()` and `faker.name.lastName()` method to resolve the placeholders respectively.
     *
     * It is also possible to provide parameters. At first, they will be parsed as json,
     * and if that isn't possible, we will fall back to string:
     *
     * ```js
     * const message = faker.fake(`You can call me at {{phone.number(+!# !## #### #####!)}}.')
     * ```
     *
     * Currently it is not possible to set more than a single parameter.
     *
     * It is also NOT possible to use any non-faker methods or plain javascript in such templates.
     *
     * @param str The template string that will get interpolated. Must not be empty.
     *
     * @see faker.helpers.mustache() to use custom functions for resolution.
     * @see faker.helpers.fake()
     *
     * @example
     * faker.fake('{{name.lastName}}') // 'Barrows'
     * faker.fake('{{name.lastName}}, {{name.firstName}} {{name.suffix}}') // 'Durgan, Noe MD'
     * faker.fake('This is static test.') // 'This is static test.'
     * faker.fake('Good Morning {{name.firstName}}!') // 'Good Morning Estelle!'
     * faker.fake('You can call me at {{phone.number(!## ### #####!)}}.') // 'You can call me at 202 555 973722.'
     * faker.fake('I flipped the coin and got: {{helpers.arrayElement(["heads", "tails"])}}') // 'I flipped the coin and got: tails'
     *
     * @since 3.0.0
     *
     * @deprecated Use faker.helpers.fake() instead.
     */
    fake(str: string): string;
}
