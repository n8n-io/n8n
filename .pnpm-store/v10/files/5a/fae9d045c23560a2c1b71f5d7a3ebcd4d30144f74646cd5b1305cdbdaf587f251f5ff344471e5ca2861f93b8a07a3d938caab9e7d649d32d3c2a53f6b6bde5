import { describe, it, expect } from 'vitest';
import { parseDOM } from 'htmlparser2';
import { type Cheerio } from './index.js';
import { cheerio, fruits, food, noscript } from './__fixtures__/fixtures.js';
import type { Element } from 'domhandler';

declare module './index.js' {
  interface Cheerio<T> {
    myPlugin(...args: unknown[]): {
      context: Cheerio<T>;
      args: unknown[];
    };
    foo(): void;
  }
}

function testAppleSelect($apple: ArrayLike<Element>) {
  expect($apple).toHaveLength(1);
  const apple = $apple[0];
  expect(apple.parentNode).toHaveProperty('tagName', 'ul');
  expect(apple.prev).toBe(null);
  expect((apple.next as Element).attribs).toHaveProperty('class', 'orange');
  expect(apple.childNodes).toHaveLength(1);
  expect(apple.childNodes[0]).toHaveProperty('data', 'Apple');
}

describe('cheerio', () => {
  it('cheerio(null) should be empty', () => {
    expect(cheerio(null as never)).toHaveLength(0);
  });

  it('cheerio(undefined) should be empty', () => {
    expect(cheerio(undefined)).toHaveLength(0);
  });

  it("cheerio('') should be empty", () => {
    expect(cheerio('')).toHaveLength(0);
  });

  it('cheerio(selector) with no context or root should be empty', () => {
    expect(cheerio('.h2')).toHaveLength(0);
    expect(cheerio('#fruits')).toHaveLength(0);
  });

  it('cheerio(node) : should override previously-loaded nodes', () => {
    const $ = cheerio.load('<div><span></span></div>');
    const spanNode = $('span')[0];
    const $span = $(spanNode);
    expect($span[0]).toBe(spanNode);
  });

  it('should be able to create html without a root or context', () => {
    const $h2 = cheerio('<h2>');
    expect($h2).not.toHaveLength(0);
    expect($h2).toHaveLength(1);
    expect($h2[0]).toHaveProperty('tagName', 'h2');
  });

  it('should be able to create complicated html', () => {
    const $script = cheerio(
      '<script src="script.js" type="text/javascript"></script>',
    ) as Cheerio<Element>;
    expect($script).not.toHaveLength(0);
    expect($script).toHaveLength(1);
    expect($script[0].attribs).toHaveProperty('src', 'script.js');
    expect($script[0].attribs).toHaveProperty('type', 'text/javascript');
    expect($script[0].childNodes).toHaveLength(0);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to select .apple with only a context', () => {
    const $apple = cheerio('.apple', fruits);
    testAppleSelect($apple);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to select .apple with a node as context', () => {
    const $apple = cheerio('.apple', cheerio(fruits)[0]);
    testAppleSelect($apple);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to select .apple with only a root', () => {
    const $apple = cheerio('.apple', null, fruits);
    testAppleSelect($apple);
  });

  it('should be able to select an id', () => {
    const $fruits = cheerio('#fruits', null, fruits);
    expect($fruits).toHaveLength(1);
    expect($fruits[0].attribs).toHaveProperty('id', 'fruits');
  });

  it('should be able to select a tag', () => {
    const $ul = cheerio('ul', fruits);
    expect($ul).toHaveLength(1);
    expect($ul[0].tagName).toBe('ul');
  });

  it('should accept a node reference as a context', () => {
    const $elems = cheerio('<div><span></span></div>');
    expect(cheerio('span', $elems[0])).toHaveLength(1);
  });

  it('should accept an array of node references as a context', () => {
    const $elems = cheerio('<div><span></span></div>');
    expect(cheerio('span', $elems.toArray())).toHaveLength(1);
  });

  it('should select only elements inside given context (Issue #193)', () => {
    const $ = cheerio.load(food);
    const $fruits = $('#fruits');
    const fruitElements = $('li', $fruits);

    expect(fruitElements).toHaveLength(3);
  });

  it('should be able to select multiple tags', () => {
    const $fruits = cheerio('li', null, fruits);
    expect($fruits).toHaveLength(3);
    const classes = ['apple', 'orange', 'pear'];
    $fruits.each((idx, $fruit) => {
      expect($fruit.attribs).toHaveProperty('class', classes[idx]);
    });
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to do: cheerio("#fruits .apple")', () => {
    const $apple = cheerio('#fruits .apple', fruits);
    testAppleSelect($apple);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to do: cheerio("li.apple")', () => {
    const $apple = cheerio('li.apple', fruits);
    testAppleSelect($apple);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should be able to select by attributes', () => {
    const $apple = cheerio('li[class=apple]', fruits);
    testAppleSelect($apple);
  });

  it('should be able to select multiple classes: cheerio(".btn.primary")', () => {
    const $a = cheerio(
      '.btn.primary',
      '<p><a class="btn primary" href="#">Save</a></p>',
    );
    expect($a).toHaveLength(1);
    expect($a[0].childNodes[0]).toHaveProperty('data', 'Save');
  });

  it('should not create a top-level node', () => {
    const $elem = cheerio('* div', '<div>');
    expect($elem).toHaveLength(0);
  });

  it('should be able to select multiple elements: cheerio(".apple, #fruits")', () => {
    const $elems = cheerio('.apple, #fruits', fruits);
    expect($elems).toHaveLength(2);

    const $apple = $elems
      .toArray()
      .filter((elem) => elem.attribs['class'] === 'apple');
    const $fruit = $elems
      .toArray()
      .find((elem) => elem.attribs['id'] === 'fruits');
    testAppleSelect($apple);
    expect($fruit?.attribs).toHaveProperty('id', 'fruits');
  });

  it('should select first element cheerio(:first)', () => {
    const $elem = cheerio('li:first', fruits);
    expect($elem.attr('class')).toBe('apple');

    const $filtered = cheerio('li', fruits).filter(':even');
    expect($filtered).toHaveLength(2);
  });

  it('should be able to select immediate children: cheerio("#fruits > .pear")', () => {
    const $food = cheerio(food);
    cheerio('.pear', $food).append('<li class="pear">Another Pear!</li>');
    expect(cheerio('#fruits .pear', $food)).toHaveLength(2);
    const $elem = cheerio('#fruits > .pear', $food);
    expect($elem).toHaveLength(1);
    expect($elem.attr('class')).toBe('pear');
  });

  it('should be able to select immediate children: cheerio(".apple + .pear")', () => {
    expect(cheerio('.apple + li', fruits)).toHaveLength(1);
    expect(cheerio('.apple + .pear', fruits)).toHaveLength(0);
    const $elem = cheerio('.apple + .orange', fruits);
    expect($elem).toHaveLength(1);
    expect($elem.attr('class')).toBe('orange');
  });

  it('should be able to select immediate children: cheerio(".apple ~ .pear")', () => {
    expect(cheerio('.apple ~ li', fruits)).toHaveLength(2);
    expect(cheerio('.apple ~ .pear', fruits).attr('class')).toBe('pear');
  });

  it('should handle wildcards on attributes: cheerio("li[class*=r]")', () => {
    const $elem = cheerio('li[class*=r]', fruits);
    expect($elem).toHaveLength(2);
    expect($elem.eq(0).attr('class')).toBe('orange');
    expect($elem.eq(1).attr('class')).toBe('pear');
  });

  it('should handle beginning of attr selectors: cheerio("li[class^=o]")', () => {
    const $elem = cheerio('li[class^=o]', fruits);
    expect($elem).toHaveLength(1);
    expect($elem.eq(0).attr('class')).toBe('orange');
  });

  it('should handle beginning of attr selectors: cheerio("li[class$=e]")', () => {
    const $elem = cheerio('li[class$=e]', fruits);
    expect($elem).toHaveLength(2);
    expect($elem.eq(0).attr('class')).toBe('apple');
    expect($elem.eq(1).attr('class')).toBe('orange');
  });

  it('(extended Array) should not interfere with prototype methods (issue #119)', () => {
    const extended: any = [];
    extended.find =
      extended.children =
      extended.each =
        function () {
          /* Ignore */
        };
    const $empty = cheerio(extended);

    expect($empty.find).toBe(cheerio.prototype.find);
    expect($empty.children).toBe(cheerio.prototype.children);
    expect($empty.each).toBe(cheerio.prototype.each);
  });

  it('cheerio.html(null) should return a "" string', () => {
    expect(cheerio.html(null as never)).toBe('');
  });

  it('should set html(number) as a string', () => {
    const $elem = cheerio('<div>');
    $elem.html(123 as never);
    expect(typeof $elem.text()).toBe('string');
  });

  it('should set text(number) as a string', () => {
    const $elem = cheerio('<div>');
    $elem.text(123 as never);
    expect(typeof $elem.text()).toBe('string');
  });

  describe('.load', () => {
    it('should generate selections as proper instances', () => {
      const $ = cheerio.load(fruits);

      expect($('.apple')).toBeInstanceOf($);
    });

    // Issue #1092
    it('should handle a character `)` in `:contains` selector', () => {
      const result = cheerio.load('<p>)aaa</p>')(
        String.raw`:contains('\)aaa')`,
      );
      expect(result).toHaveLength(3);
      expect(result.first().prop('tagName')).toBe('HTML');
      expect(result.eq(1).prop('tagName')).toBe('BODY');
      expect(result.last().prop('tagName')).toBe('P');
    });

    it('should be able to filter down using the context', () => {
      const $ = cheerio.load(fruits);
      const apple = $('.apple', 'ul');
      const lis = $('li', 'ul');

      expect(apple).toHaveLength(1);
      expect(lis).toHaveLength(3);
    });

    it('should preserve root content', () => {
      const $ = cheerio.load(fruits);
      // Root should not be overwritten
      const el = $('<div></div>');
      expect(Object.is(el, el._root)).toBe(false);
      // Query has to have results
      expect($('li', 'ul')).toHaveLength(3);
    });

    it('should allow loading a pre-parsed DOM', () => {
      const dom = parseDOM(food);
      const $ = cheerio.load(dom);

      expect($('ul')).toHaveLength(3);
    });

    it('should allow loading a single element', () => {
      const el = parseDOM(food)[0];
      const $ = cheerio.load(el);

      expect($('ul')).toHaveLength(3);
    });

    it('should render xml in html() when options.xml = true', () => {
      const str = '<MixedCaseTag UPPERCASEATTRIBUTE=""></MixedCaseTag>';
      const expected = '<MixedCaseTag UPPERCASEATTRIBUTE=""/>';
      const $ = cheerio.load(str, { xml: true });

      expect($('MixedCaseTag').get(0)).toHaveProperty(
        'tagName',
        'MixedCaseTag',
      );
      expect($.html()).toBe(expected);
    });

    it('should render xml in html() when options.xml = true passed to html()', () => {
      const str = '<MixedCaseTag UPPERCASEATTRIBUTE=""></MixedCaseTag>';
      // Since parsing done without xml flag, all tags converted to lowercase
      const expectedXml =
        '<html><head/><body><mixedcasetag uppercaseattribute=""/></body></html>';
      const expectedNoXml =
        '<html><head></head><body><mixedcasetag uppercaseattribute=""></mixedcasetag></body></html>';
      const $ = cheerio.load(str);

      expect($('MixedCaseTag').get(0)).toHaveProperty(
        'tagName',
        'mixedcasetag',
      );
      expect($.html()).toBe(expectedNoXml);
      expect($.html({ xml: true })).toBe(expectedXml);
    });

    it('should respect options on the element level', () => {
      const str =
        '<!doctype html><html><head><title>Some test</title></head><body><footer><p>Copyright &copy; 2003-2014</p></footer></body></html>';
      const expectedHtml = '<p>Copyright &copy; 2003-2014</p>';
      const expectedXml = '<p>Copyright © 2003-2014</p>';
      const domNotEncoded = cheerio.load(str, {
        xml: { decodeEntities: false },
      });
      const domEncoded = cheerio.load(str);

      expect(domNotEncoded('footer').html()).toBe(expectedHtml);
      expect(domEncoded('footer').html()).toBe(expectedXml);
    });

    it('should use htmlparser2 if xml option is used', () => {
      const str = '<div></div>';
      const dom = cheerio.load(str, null, false);
      expect(dom.html()).toBe(str);
    });

    it('should return a fully-qualified Function', () => {
      const $ = cheerio.load('<div>');

      expect($).toBeInstanceOf(Function);
    });

    describe('prototype extensions', () => {
      it('should honor extensions defined on `prototype` property', () => {
        const $ = cheerio.load('<div>');

        $.prototype.myPlugin = function (...args: unknown[]) {
          return {
            context: this,
            args,
          };
        };

        const $div = $('div');

        expect(typeof $div.myPlugin).toBe('function');
        expect($div.myPlugin().context).toBe($div);
        expect($div.myPlugin(1, 2, 3).args).toStrictEqual([1, 2, 3]);
      });

      it('should honor extensions defined on `fn` property', () => {
        const $ = cheerio.load('<div>');
        $.fn.myPlugin = function (...args: unknown[]) {
          return {
            context: this,
            args,
          };
        };

        const $div = $('div');

        expect(typeof $div.myPlugin).toBe('function');
        expect($div.myPlugin().context).toBe($div);
        expect($div.myPlugin(1, 2, 3).args).toStrictEqual([1, 2, 3]);
      });

      it('should isolate extensions between loaded functions', () => {
        const $a = cheerio.load('<div>');
        const $b = cheerio.load('<div>');

        $a.prototype.foo = function () {
          /* Ignore */
        };

        expect($b('div').foo).toBeUndefined();
      });
    });
  });

  describe('parse5 options', () => {
    // Should parse noscript tags only with false option value
    it('{scriptingEnabled: ???}', () => {
      // [default] `scriptingEnabled: true` - tag contains one text element
      const withScripts = cheerio.load(noscript)('noscript');
      expect(withScripts).toHaveLength(1);
      expect(withScripts[0].children).toHaveLength(1);
      expect(withScripts[0].children[0].type).toBe('text');

      // `scriptingEnabled: false` - content of noscript will parsed
      const noScripts = cheerio.load(noscript, { scriptingEnabled: false })(
        'noscript',
      );
      expect(noScripts).toHaveLength(1);
      expect(noScripts[0].children).toHaveLength(2);
      expect(noScripts[0].children[0].type).toBe('comment');
      expect(noScripts[0].children[1].type).toBe('tag');
      expect(noScripts[0].children[1]).toHaveProperty('name', 'a');

      // `scriptingEnabled: ???` - should acts as true
      for (const val of [undefined, null, 0, '']) {
        const options = { scriptingEnabled: val as never };
        const result = cheerio.load(noscript, options)('noscript');
        expect(result).toHaveLength(1);
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].type).toBe('text');
      }
    });

    // Should contain location data only with truthful option value
    it('{sourceCodeLocationInfo: ???}', () => {
      // Location data should not be present
      for (const val of [undefined, null, 0, false, '']) {
        const options = { sourceCodeLocationInfo: val as never };
        const result = cheerio.load(noscript, options)('noscript');
        expect(result).toHaveLength(1);
        expect(result[0]).not.toHaveProperty('sourceCodeLocation');
      }

      // Location data should be present
      for (const val of [true, 1, 'test']) {
        const options = { sourceCodeLocationInfo: val as never };
        const result = cheerio.load(noscript, options)('noscript');
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('sourceCodeLocation');
        expect(typeof result[0].sourceCodeLocation).toBe('object');
      }
    });
  });
});
