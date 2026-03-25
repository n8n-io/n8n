/**
 * This file includes tests for deprecated APIs. The methods are expected to be
 * removed in the next major release of Cheerio, but their stability should be
 * maintained until that time.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cheerio, food, fruits } from '../__fixtures__/fixtures.js';

describe('deprecated APIs', () => {
  describe('cheerio module', () => {
    describe('.parseHTML', () => {
      it('(html) : should preserve content', () => {
        const html = '<div>test div</div>';
        expect(cheerio(cheerio.parseHTML(html)[0]).html()).toBe('test div');
      });
    });

    describe('.merge', () => {
      it('should be a function', () => {
        expect(typeof cheerio.merge).toBe('function');
      });

      // #1674 - merge, wont accept Cheerio object
      it('should be a able merge array and cheerio object', () => {
        const ret = cheerio.merge<unknown>(cheerio(), ['elem1', 'elem2']);
        expect(typeof ret).toBe('object');
        expect(ret).toHaveLength(2);
      });

      it('(arraylike, arraylike) : should modify the first array, but not the second', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [4, 5, 6];
        const ret = cheerio.merge(arr1, arr2);

        expect(typeof ret).toBe('object');
        expect(Array.isArray(ret)).toBe(true);
        expect(ret).toBe(arr1);
        expect(arr1).toHaveLength(6);
        expect(arr2).toHaveLength(3);
      });

      it('(arraylike, arraylike) : should handle objects that arent arrays, but are arraylike', () => {
        const arr1: ArrayLike<string> = {
          length: 3,
          0: 'a',
          1: 'b',
          2: 'c',
        };
        const arr2 = {
          length: 3,
          0: 'd',
          1: 'e',
          2: 'f',
        };

        cheerio.merge(arr1, arr2);
        expect(arr1).toHaveLength(6);
        expect(arr1[3]).toBe('d');
        expect(arr1[4]).toBe('e');
        expect(arr1[5]).toBe('f');
        expect(arr2).toHaveLength(3);
      });

      it('(?, ?) : should gracefully reject invalid inputs', () => {
        expect(cheerio.merge([4], 3 as never)).toBeUndefined();
        expect(cheerio.merge({} as never, {} as never)).toBeUndefined();
        expect(cheerio.merge([], {} as never)).toBeUndefined();
        expect(cheerio.merge({} as never, [])).toBeUndefined();

        const fakeArray = { length: 3, 0: 'a', 1: 'b', 3: 'd' };
        expect(cheerio.merge(fakeArray, [])).toBeUndefined();
        expect(cheerio.merge([], fakeArray)).toBeUndefined();

        expect(cheerio.merge({ length: '7' } as never, [])).toBeUndefined();
        expect(cheerio.merge({ length: -1 }, [])).toBeUndefined();
      });

      it('(?, ?) : should no-op on invalid inputs', () => {
        const fakeArray1 = { length: 3, 0: 'a', 1: 'b', 3: 'd' };
        cheerio.merge(fakeArray1, []);
        expect(fakeArray1).toHaveLength(3);
        expect(fakeArray1[0]).toBe('a');
        expect(fakeArray1[1]).toBe('b');
        expect(fakeArray1[3]).toBe('d');
        cheerio.merge([], fakeArray1);
        expect(fakeArray1).toHaveLength(3);
        expect(fakeArray1[0]).toBe('a');
        expect(fakeArray1[1]).toBe('b');
        expect(fakeArray1[3]).toBe('d');
      });
    });

    describe('.contains', () => {
      let $: typeof cheerio;

      beforeEach(() => {
        $ = cheerio.load(food);
      });

      it('(container, contained) : should correctly detect the provided element', () => {
        const $food = $('#food');
        const $fruits = $('#fruits');
        const $apple = $('.apple');

        expect(cheerio.contains($food[0], $fruits[0])).toBe(true);
        expect(cheerio.contains($food[0], $apple[0])).toBe(true);
      });

      it('(container, other) : should not detect elements that are not contained', () => {
        const $fruits = $('#fruits');
        const $vegetables = $('#vegetables');
        const $apple = $('.apple');

        expect(cheerio.contains($vegetables[0], $apple[0])).toBe(false);
        expect(cheerio.contains($fruits[0], $vegetables[0])).toBe(false);
        expect(cheerio.contains($vegetables[0], $fruits[0])).toBe(false);
        expect(cheerio.contains($fruits[0], $fruits[0])).toBe(false);
        expect(cheerio.contains($vegetables[0], $vegetables[0])).toBe(false);
      });
    });

    describe('.root', () => {
      it('returns an empty selection', () => {
        const $empty = cheerio.root();
        expect($empty).toHaveLength(1);
        expect($empty[0].children).toHaveLength(0);
      });
    });
  });

  describe('Cheerio function', () => {
    it('.load', () => {
      const $1 = cheerio.load(fruits);
      const $2 = $1.load('<div><p>Some <a>text</a>.</p></div>');

      expect($2('a')).toHaveLength(1);
    });

    /**
     * The `.html` static method defined on the "loaded" Cheerio factory
     * function is deprecated.
     *
     * In order to promote consistency with the jQuery library, users are
     * encouraged to instead use the instance method of the same name.
     *
     * @example
     *
     * ```js
     * const $ = cheerio.load('<h1>Hello, <span>world</span>.</h1>');
     *
     * $('h1').html();
     * //=> '<h1>Hello, <span>world</span>.'
     * ```
     *
     * @example <caption>To render the markup of an entire document, invoke the
     * `html` function exported by the Cheerio module with a "root"
     * selection.</caption>
     *
     * ```js
     * cheerio.html($.root());
     * //=> '<html><head></head><body><h1>Hello, <span>world</span>.</h1></body></html>'
     * ```
     */
    describe('.html - deprecated API', () => {
      it('() : of empty cheerio object should return null', () => {
        /*
         * Note: the direct invocation of the Cheerio constructor function is
         * also deprecated.
         */
        const $ = cheerio();
        expect($.html()).toBe(null);
      });

      it('(selector) : should return the outerHTML of the selected element', () => {
        const $ = cheerio.load(fruits);
        expect($.html('.pear')).toBe('<li class="pear">Pear</li>');
      });
    });

    /**
     * The `.xml` static method defined on the "loaded" Cheerio factory function
     * is deprecated. Users are encouraged to instead use the `xml` function
     * exported by the Cheerio module.
     *
     * @example
     *
     * ```js
     * cheerio.xml($.root());
     * ```
     */
    describe('.xml  - deprecated API', () => {
      it('() :  renders XML', () => {
        const $ = cheerio.load('<foo></foo>', { xmlMode: true });
        expect($.xml()).toBe('<foo/>');
      });
    });

    /**
     * The `.text` static method defined on the "loaded" Cheerio factory
     * function is deprecated.
     *
     * In order to promote consistency with the jQuery library, users are
     * encouraged to instead use the instance method of the same name.
     *
     * @example
     *
     * ```js
     * const $ = cheerio.load('<h1>Hello, <span>world</span>.</h1>');
     * $('h1').text();
     * //=> 'Hello, world.'
     * ```
     *
     * @example <caption>To render the text content of an entire document,
     * invoke the `text` function exported by the Cheerio module with a "root"
     * selection. </caption>
     *
     * ```js
     * cheerio.text($.root());
     * //=> 'Hello, world.'
     * ```
     */
    describe('.text  - deprecated API', () => {
      it('(cheerio object) : should return the text contents of the specified elements', () => {
        const $ = cheerio.load('<a>This is <em>content</em>.</a>');
        expect($.text($('a'))).toBe('This is content.');
      });

      it('(cheerio object) : should omit comment nodes', () => {
        const $ = cheerio.load(
          '<a>This is <!-- a comment --> not a comment.</a>',
        );
        expect($.text($('a'))).toBe('This is  not a comment.');
      });

      it('(cheerio object) : should include text contents of children recursively', () => {
        const $ = cheerio.load(
          '<a>This is <div>a child with <span>another child and <!-- a comment --> not a comment</span> followed by <em>one last child</em> and some final</div> text.</a>',
        );
        expect($.text($('a'))).toBe(
          'This is a child with another child and  not a comment followed by one last child and some final text.',
        );
      });

      it('() : should return the rendered text content of the root', () => {
        const $ = cheerio.load(
          '<a>This is <div>a child with <span>another child and <!-- a comment --> not a comment</span> followed by <em>one last child</em> and some final</div> text.</a>',
        );
        expect($.text()).toBe(
          'This is a child with another child and  not a comment followed by one last child and some final text.',
        );
      });

      it('(cheerio object) : should not omit script tags', () => {
        const $ = cheerio.load('<script>console.log("test")</script>');
        expect($.text()).toBe('console.log("test")');
      });

      it('(cheerio object) : should omit style tags', () => {
        const $ = cheerio.load(
          '<style type="text/css">.cf-hidden { display: none; }</style>',
        );
        expect($.text()).toBe('.cf-hidden { display: none; }');
      });
    });
  });
});
