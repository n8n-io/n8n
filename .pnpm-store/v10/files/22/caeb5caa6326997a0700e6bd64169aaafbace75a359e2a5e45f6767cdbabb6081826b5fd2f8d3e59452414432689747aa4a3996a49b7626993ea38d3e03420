import { describe, it, expect, beforeEach } from 'vitest';
import { cheerio, food, eleven } from './__fixtures__/fixtures.js';
import { type CheerioAPI } from './index.js';

describe('cheerio', () => {
  describe('.html', () => {
    it('() : should return innerHTML; $.html(obj) should return outerHTML', () => {
      const $div = cheerio(
        'div',
        '<div><span>foo</span><span>bar</span></div>',
      );
      const span = $div.children()[1];
      expect(cheerio(span).html()).toBe('bar');
      expect(cheerio.html(span)).toBe('<span>bar</span>');
    });

    it('(<obj>) : should accept an object, an array, or a cheerio object', () => {
      const $span = cheerio('<span>foo</span>');
      expect(cheerio.html($span[0])).toBe('<span>foo</span>');
      expect(cheerio.html($span)).toBe('<span>foo</span>');
    });

    it('(<value>) : should be able to set to an empty string', () => {
      const $elem = cheerio('<span>foo</span>').html('');
      expect(cheerio.html($elem)).toBe('<span></span>');
    });

    it('(<root>) : does not render the root element', () => {
      const $ = cheerio.load('');
      expect(cheerio.html($.root())).toBe(
        '<html><head></head><body></body></html>',
      );
    });

    it('(<elem>, <root>, <elem>) : does not render the root element', () => {
      const $ = cheerio.load('<div>a div</div><span>a span</span>');
      const $collection = $('div').add($.root()).add('span');
      const expected =
        '<html><head></head><body><div>a div</div><span>a span</span></body></html><div>a div</div><span>a span</span>';
      expect(cheerio.html($collection)).toBe(expected);
    });

    it('() : does not crash with `null` as `this` value', () => {
      const { html } = cheerio;
      expect(html.call(null as never)).toBe('');
      expect(html.call(null as never, '#nothing')).toBe('');
    });
  });

  describe('.text', () => {
    it('(cheerio object) : should return the text contents of the specified elements', () => {
      const $ = cheerio.load('<a>This is <em>content</em>.</a>');
      expect(cheerio.text($('a'))).toBe('This is content.');
    });

    it('(cheerio object) : should omit comment nodes', () => {
      const $ = cheerio.load(
        '<a>This is <!-- a comment --> not a comment.</a>',
      );
      expect(cheerio.text($('a'))).toBe('This is  not a comment.');
    });

    it('(cheerio object) : should include text contents of children recursively', () => {
      const $ = cheerio.load(
        '<a>This is <div>a child with <span>another child and <!-- a comment --> not a comment</span> followed by <em>one last child</em> and some final</div> text.</a>',
      );
      expect(cheerio.text($('a'))).toBe(
        'This is a child with another child and  not a comment followed by one last child and some final text.',
      );
    });

    it('() : should return the rendered text content of the root', () => {
      const $ = cheerio.load(
        '<a>This is <div>a child with <span>another child and <!-- a comment --> not a comment</span> followed by <em>one last child</em> and some final</div> text.</a>',
      );
      expect(cheerio.text($.root())).toBe(
        'This is a child with another child and  not a comment followed by one last child and some final text.',
      );
    });

    it('(cheerio object) : should not omit script tags', () => {
      const $ = cheerio.load('<script>console.log("test")</script>');
      expect(cheerio.text($.root())).toBe('console.log("test")');
    });

    it('(cheerio object) : should omit style tags', () => {
      const $ = cheerio.load(
        '<style type="text/css">.cf-hidden { display: none; }</style>',
      );
      expect($.text()).toBe('.cf-hidden { display: none; }');
    });

    it('() : does not crash with `null` as `this` value', () => {
      const { text } = cheerio;
      expect(text.call(null as never)).toBe('');
    });
  });

  describe('.parseHTML', () => {
    const $ = cheerio.load('');

    it('() : returns null', () => {
      expect($.parseHTML()).toBe(null);
    });

    it('(null) : returns null', () => {
      expect($.parseHTML(null)).toBe(null);
    });

    it('("") : returns null', () => {
      expect($.parseHTML('')).toBe(null);
    });

    it('(largeHtmlString) : parses large HTML strings', () => {
      const html = '<div></div>'.repeat(10);
      const nodes = $.parseHTML(html);

      expect(nodes.length).toBe(10);
      expect(nodes).toBeInstanceOf(Array);
    });

    it('("<script>") : ignores scripts by default', () => {
      const html = '<script>undefined()</script>';
      expect($.parseHTML(html)).toHaveLength(0);
    });

    it('("<script>", true) : preserves scripts when requested', () => {
      const html = '<script>undefined()</script>';
      expect($.parseHTML(html, true)[0]).toHaveProperty('tagName', 'script');
    });

    it('("scriptAndNonScript) : preserves non-script nodes', () => {
      const html = '<script>undefined()</script><div></div>';
      expect($.parseHTML(html)[0]).toHaveProperty('tagName', 'div');
    });

    it('(scriptAndNonScript, true) : Preserves script position', () => {
      const html = '<script>undefined()</script><div></div>';
      expect($.parseHTML(html, true)[0]).toHaveProperty('tagName', 'script');
    });

    it('(text) : returns a text node', () => {
      expect($.parseHTML('text')[0].type).toBe('text');
    });

    it('(<tab>>text) : preserves leading whitespace', () => {
      expect($.parseHTML('\t<div></div>')[0]).toHaveProperty('data', '\t');
    });

    it('( text) : Leading spaces are treated as text nodes', () => {
      expect($.parseHTML(' <div/> ')[0].type).toBe('text');
    });

    it('(html) : should preserve content', () => {
      const html = '<div>test div</div>';
      expect(cheerio($.parseHTML(html)[0]).html()).toBe('test div');
    });

    it('(malformedHtml) : should not break', () => {
      expect($.parseHTML('<span><span>')).toHaveLength(1);
    });

    it('(garbageInput) : should not cause an error', () => {
      expect(
        $.parseHTML('<#if><tr><p>This is a test.</p></tr><#/if>'),
      ).toBeTruthy();
    });

    it('(text) : should return an array that is not effected by DOM manipulation methods', () => {
      const $div = cheerio.load('<div>');
      const elems = $div.parseHTML('<b></b><i></i>');

      $div('div').append(elems);

      expect(elems).toHaveLength(2);
    });

    it('(html, context) : should ignore context argument', () => {
      const $div = cheerio.load('<div>');
      const elems = $div.parseHTML('<script>foo</script><a>', { foo: 123 });

      $div('div').append(elems);

      expect(elems).toHaveLength(1);
    });

    it('(html, context, keepScripts) : should ignore context argument', () => {
      const $div = cheerio.load('<div>');
      const elems = $div.parseHTML(
        '<script>foo</script><a>',
        { foo: 123 },
        true,
      );

      $div('div').append(elems);

      expect(elems).toHaveLength(2);
    });
  });

  describe('.merge', () => {
    const $ = cheerio.load('');

    it('should be a function', () => {
      expect(typeof $.merge).toBe('function');
    });

    it('(arraylike, arraylike) : should modify the first array, but not the second', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [4, 5, 6];

      const ret = $.merge(arr1, arr2);
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

      $.merge(arr1, arr2);
      expect(arr1).toHaveLength(6);
      expect(arr1[3]).toBe('d');
      expect(arr1[4]).toBe('e');
      expect(arr1[5]).toBe('f');
      expect(arr2).toHaveLength(3);
    });

    it('(?, ?) : should gracefully reject invalid inputs', () => {
      expect($.merge([4], 3 as never)).toBeFalsy();
      expect($.merge({} as never, {} as never)).toBeFalsy();
      expect($.merge([], {} as never)).toBeFalsy();
      expect($.merge({} as never, [])).toBeFalsy();
      const fakeArray1 = { length: 3, 0: 'a', 1: 'b', 3: 'd' };
      expect($.merge(fakeArray1, [])).toBeFalsy();
      expect($.merge([], fakeArray1)).toBeFalsy();
      expect($.merge({ length: '7' } as never, [])).toBeFalsy();
      expect($.merge({ length: -1 }, [])).toBeFalsy();
    });

    it('(?, ?) : should no-op on invalid inputs', () => {
      const fakeArray1 = { length: 3, 0: 'a', 1: 'b', 3: 'd' };
      $.merge(fakeArray1, []);
      expect(fakeArray1).toHaveLength(3);
      expect(fakeArray1[0]).toBe('a');
      expect(fakeArray1[1]).toBe('b');
      expect(fakeArray1[3]).toBe('d');
      $.merge([], fakeArray1);
      expect(fakeArray1).toHaveLength(3);
      expect(fakeArray1[0]).toBe('a');
      expect(fakeArray1[1]).toBe('b');
      expect(fakeArray1[3]).toBe('d');
    });
  });

  describe('.contains', () => {
    let $: CheerioAPI;

    beforeEach(() => {
      $ = cheerio.load(food);
    });

    it('(container, contained) : should correctly detect the provided element', () => {
      const $food = $('#food');
      const $fruits = $('#fruits');
      const $apple = $('.apple');

      expect($.contains($food[0], $fruits[0])).toBe(true);
      expect($.contains($food[0], $apple[0])).toBe(true);
    });

    it('(container, other) : should not detect elements that are not contained', () => {
      const $fruits = $('#fruits');
      const $vegetables = $('#vegetables');
      const $apple = $('.apple');

      expect($.contains($vegetables[0], $apple[0])).toBe(false);
      expect($.contains($fruits[0], $vegetables[0])).toBe(false);
      expect($.contains($vegetables[0], $fruits[0])).toBe(false);
      expect($.contains($fruits[0], $fruits[0])).toBe(false);
      expect($.contains($vegetables[0], $vegetables[0])).toBe(false);
    });
  });

  describe('.root', () => {
    it('() : should return a cheerio-wrapped root object', () => {
      const $ = cheerio.load('<html><head></head><body>foo</body></html>');
      $.root().append('<div id="test"></div>');
      expect($.html()).toBe(
        '<html><head></head><body>foo</body></html><div id="test"></div>',
      );
    });
  });

  describe('.extract', () => {
    it('() : should extract values for selectors', () => {
      const $ = cheerio.load(eleven);

      expect(
        $.extract({
          red: [{ selector: '.red', value: 'outerHTML' }],
        }),
      ).toStrictEqual({
        red: [
          '<li class="red">Four</li>',
          '<li class="red">Five</li>',
          '<li class="red sel">Nine</li>',
        ],
      });
    });
  });
});
