import { ModuleBase } from '../../internal/module-base';
/**
 * Module to generate random texts and words.
 *
 * ### Overview
 *
 * Generate dummy content using traditional faux-Latin [lorem ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum) (in other locales to `en`, alternative words may be used).
 *
 * In order of increasing size you can generate a single [`word()`](https://fakerjs.dev/api/lorem.html#word), multiple [`words()`](https://fakerjs.dev/api/lorem.html#words), a [`sentence()`](https://fakerjs.dev/api/lorem.html#sentence), multiple [`sentences()`](https://fakerjs.dev/api/lorem.html#sentences), [`lines()`](https://fakerjs.dev/api/lorem.html#lines) separated by newlines, one [`paragraph()`](https://fakerjs.dev/api/lorem.html#paragraph), or multiple [`paragraphs()`](https://fakerjs.dev/api/lorem.html#paragraphs).
 *
 * The generic [`text()`](https://fakerjs.dev/api/lorem.html#text) method can be used to generate some text between one sentence and multiple paragraphs, while [`slug()`](https://fakerjs.dev/api/lorem.html#slug) generates an URL-friendly hyphenated string.
 */
export declare class LoremModule extends ModuleBase {
    /**
     * Generates a word of a specified length.
     *
     * @param options The expected length of the word or the options to use.
     * @param options.length The expected length of the word.
     * @param options.strategy The strategy to apply when no words with a matching length are found.
     *
     * Available error handling strategies:
     *
     * - `fail`: Throws an error if no words with the given length are found.
     * - `shortest`: Returns any of the shortest words.
     * - `closest`: Returns any of the words closest to the given length.
     * - `longest`: Returns any of the longest words.
     * - `any-length`: Returns a word with any length.
     *
     * Defaults to `'any-length'`.
     *
     * @example
     * faker.lorem.word() // 'temporibus'
     * faker.lorem.word(5) // 'velit'
     * faker.lorem.word({ strategy: 'shortest' }) // 'a'
     * faker.lorem.word({ length: { min: 5, max: 7 }, strategy: 'fail' }) // 'quaerat'
     *
     * @since 3.1.0
     */
    word(options?: number | {
        /**
         * The expected length of the word.
         *
         * @default 1
         */
        length?: number | {
            /**
             * The minimum length of the word.
             */
            min: number;
            /**
             * The maximum length of the word.
             */
            max: number;
        };
        /**
         * The strategy to apply when no words with a matching length are found.
         *
         * Available error handling strategies:
         *
         * - `fail`: Throws an error if no words with the given length are found.
         * - `shortest`: Returns any of the shortest words.
         * - `closest`: Returns any of the words closest to the given length.
         * - `longest`: Returns any of the longest words.
         * - `any-length`: Returns a word with any length.
         *
         * @default 'any-length'
         */
        strategy?: 'fail' | 'closest' | 'shortest' | 'longest' | 'any-length';
    }): string;
    /**
     * Generates a space separated list of words.
     *
     * @param wordCount The number of words to generate. Defaults to `3`.
     * @param wordCount.min The minimum number of words to generate.
     * @param wordCount.max The maximum number of words to generate.
     *
     * @example
     * faker.lorem.words() // 'qui praesentium pariatur'
     * faker.lorem.words(10) // 'debitis consectetur voluptatem non doloremque ipsum autem totam eum ratione'
     * faker.lorem.words({ min: 1, max: 3 }) // 'tenetur error cum'
     *
     * @since 2.0.1
     */
    words(wordCount?: number | {
        /**
         * The minimum number of words to generate.
         */
        min: number;
        /**
         * The maximum number of words to generate.
         */
        max: number;
    }): string;
    /**
     * Generates a space separated list of words beginning with a capital letter and ending with a period.
     *
     * @param wordCount The number of words, that should be in the sentence. Defaults to a random number between `3` and `10`.
     * @param wordCount.min The minimum number of words to generate. Defaults to `3`.
     * @param wordCount.max The maximum number of words to generate. Defaults to `10`.
     *
     * @example
     * faker.lorem.sentence() // 'Voluptatum cupiditate suscipit autem eveniet aut dolorem aut officiis distinctio.'
     * faker.lorem.sentence(5) // 'Laborum voluptatem officiis est et.'
     * faker.lorem.sentence({ min: 3, max: 5 }) // 'Fugiat repellendus nisi.'
     *
     * @since 2.0.1
     */
    sentence(wordCount?: number | {
        /**
         * The minimum number of words to generate.
         */
        min: number;
        /**
         * The maximum number of words to generate.
         */
        max: number;
    }): string;
    /**
     * Generates a slugified text consisting of the given number of hyphen separated words.
     *
     * @param wordCount The number of words to generate. Defaults to `3`.
     * @param wordCount.min The minimum number of words to generate.
     * @param wordCount.max The maximum number of words to generate.
     *
     * @example
     * faker.lorem.slug() // 'dolores-illo-est'
     * faker.lorem.slug(5) // 'delectus-totam-iusto-itaque-placeat'
     * faker.lorem.slug({ min: 1, max: 3 }) // 'illo-ratione'
     *
     * @since 4.0.0
     */
    slug(wordCount?: number | {
        /**
         * The minimum number of words to generate.
         */
        min: number;
        /**
         * The maximum number of words to generate.
         */
        max: number;
    }): string;
    /**
     * Generates the given number of sentences.
     *
     * @param sentenceCount The number of sentences to generate. Defaults to a random number between `2` and `6`.
     * @param sentenceCount.min The minimum number of sentences to generate. Defaults to `2`.
     * @param sentenceCount.max The maximum number of sentences to generate. Defaults to `6`.
     * @param separator The separator to add between sentences. Defaults to `' '`.
     *
     * @example
     * faker.lorem.sentences() // 'Iste molestiae incidunt aliquam possimus reprehenderit eum corrupti. Deleniti modi voluptatem nostrum ut esse.'
     * faker.lorem.sentences(2) // 'Maxime vel numquam quibusdam. Dignissimos ex molestias quos aut molestiae quam nihil occaecati maiores.'
     * faker.lorem.sentences(2, '\n')
     * // 'Et rerum a unde tempora magnam sit nisi.
     * // Et perspiciatis ipsam omnis.'
     * faker.lorem.sentences({ min: 1, max: 3 }) // 'Placeat ex natus tenetur repellendus repellendus iste. Optio nostrum veritatis.'
     *
     * @since 2.0.1
     */
    sentences(sentenceCount?: number | {
        /**
         * The minimum number of sentences to generate.
         */
        min: number;
        /**
         * The maximum number of sentences to generate.
         */
        max: number;
    }, separator?: string): string;
    /**
     * Generates a paragraph with the given number of sentences.
     *
     * @param sentenceCount The number of sentences to generate. Defaults to `3`.
     * @param sentenceCount.min The minimum number of sentences to generate.
     * @param sentenceCount.max The maximum number of sentences to generate.
     *
     * @example
     * faker.lorem.paragraph() // 'Non architecto nam unde sint. Ex tenetur dolor facere optio aut consequatur. Ea laudantium reiciendis repellendus.'
     * faker.lorem.paragraph(2) // 'Animi possimus nemo consequuntur ut ea et tempore unde qui. Quis corporis esse occaecati.'
     * faker.lorem.paragraph({ min: 1, max: 3 }) // 'Quis doloribus necessitatibus sint. Rerum accusamus impedit corporis porro.'
     *
     * @since 2.0.1
     */
    paragraph(sentenceCount?: number | {
        /**
         * The minimum number of sentences to generate.
         */
        min: number;
        /**
         * The maximum number of sentences to generate.
         */
        max: number;
    }): string;
    /**
     * Generates the given number of paragraphs.
     *
     * @param paragraphCount The number of paragraphs to generate. Defaults to `3`.
     * @param paragraphCount.min The minimum number of paragraphs to generate.
     * @param paragraphCount.max The maximum number of paragraphs to generate.
     * @param separator The separator to use. Defaults to `'\n'`.
     *
     * @example
     * faker.lorem.paragraphs()
     * // 'Beatae voluptatem dicta et assumenda fugit eaque quidem consequatur. Fuga unde provident. Id reprehenderit soluta facilis est laborum laborum. Illum aut non ut. Est nulla rem ipsa.
     * // Voluptatibus quo pariatur est. Temporibus deleniti occaecati pariatur nemo est molestias voluptas. Doloribus commodi et et exercitationem vel et. Omnis inventore cum aut amet.
     * // Sapiente deleniti et. Ducimus maiores eum. Rem dolorem itaque aliquam.'
     *
     * faker.lorem.paragraphs(5)
     * // 'Quia hic sunt ducimus expedita quo impedit soluta. Quam impedit et ipsum optio. Unde dolores nulla nobis vero et aspernatur officiis.
     * // Aliquam dolorem temporibus dolores voluptatem voluptatem qui nostrum quia. Sit hic facilis rerum eius. Beatae doloribus nesciunt iste ipsum.
     * // Natus nam eum nulla voluptas molestiae fuga libero nihil voluptatibus. Sed quam numquam eum ipsam temporibus eaque ut et. Enim quas debitis quasi quis. Vitae et vitae.
     * // Repellat voluptatem est laborum illo harum sed reprehenderit aut. Quo sit et. Exercitationem blanditiis totam velit ad dicta placeat.
     * // Rerum non eum incidunt amet quo. Eaque laborum ut. Recusandae illo ab distinctio veritatis. Cum quis architecto ad maxime a.'
     *
     * faker.lorem.paragraphs(2, '<br/>\n')
     * // 'Eos magnam aut qui accusamus. Sapiente quas culpa totam excepturi. Blanditiis totam distinctio occaecati dignissimos cumque atque qui officiis.<br/>
     * // Nihil quis vel consequatur. Blanditiis commodi deserunt sunt animi dolorum. A optio porro hic dolorum fugit aut et sint voluptas. Minima ad sed ipsa est non dolores.'
     *
     * faker.lorem.paragraphs({ min: 1, max: 3 })
     * // 'Eum nam fugiat laudantium.
     * // Dignissimos tempore porro necessitatibus commodi nam.
     * // Veniam at commodi iste perferendis totam dolorum corporis ipsam.'
     *
     * @since 2.0.1
     */
    paragraphs(paragraphCount?: number | {
        /**
         * The minimum number of paragraphs to generate.
         */
        min: number;
        /**
         * The maximum number of paragraphs to generate.
         */
        max: number;
    }, separator?: string): string;
    /**
     * Generates a random text based on a random lorem method.
     *
     * @example
     * faker.lorem.text() // 'Doloribus autem non quis vero quia.'
     * faker.lorem.text()
     * // 'Rerum eum reiciendis id ipsa hic dolore aut laborum provident.
     * // Quis beatae quis corporis veritatis corrupti ratione delectus sapiente ut.
     * // Quis ut dolor dolores facilis possimus tempore voluptates.
     * // Iure nam officia optio cumque.
     * // Dolor tempora iusto.'
     *
     * @since 3.1.0
     */
    text(): string;
    /**
     * Generates the given number lines of lorem separated by `'\n'`.
     *
     * @param lineCount The number of lines to generate. Defaults to a random number between `1` and `5`.
     * @param lineCount.min The minimum number of lines to generate. Defaults to `1`.
     * @param lineCount.max The maximum number of lines to generate. Defaults to `5`.
     *
     * @example
     * faker.lorem.lines()
     * // 'Rerum quia aliquam pariatur explicabo sint minima eos.
     * // Voluptatem repellat consequatur deleniti qui quibusdam harum cumque.
     * // Enim eveniet a qui.
     * // Consectetur velit eligendi animi nostrum veritatis.'
     *
     * faker.lorem.lines()
     * // 'Soluta deserunt eos quam reiciendis libero autem enim nam ut.
     * // Voluptate aut aut.'
     *
     * faker.lorem.lines(2)
     * // 'Quod quas nam quis impedit aut consequuntur.
     * // Animi dolores aspernatur.'
     *
     * faker.lorem.lines({ min: 1, max: 3 })
     * // 'Error dolorem natus quos eum consequatur necessitatibus.'
     *
     * @since 3.1.0
     */
    lines(lineCount?: number | {
        /**
         * The minimum number of lines to generate.
         */
        min: number;
        /**
         * The maximum number of lines to generate.
         */
        max: number;
    }): string;
}
