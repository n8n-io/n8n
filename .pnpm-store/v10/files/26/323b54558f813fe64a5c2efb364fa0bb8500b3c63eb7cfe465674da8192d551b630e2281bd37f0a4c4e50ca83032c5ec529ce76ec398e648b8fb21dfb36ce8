import { describe, it, expect, beforeEach } from 'vitest';
import { load, type Cheerio } from '../index.js';
import type { Element } from 'domhandler';
import { cheerio, mixedText } from '../__fixtures__/fixtures.js';

describe('$(...)', () => {
  describe('.css', () => {
    it('(prop): should return a css property value', () => {
      const el = cheerio('<li style="hai: there">');
      expect(el.css('hai')).toBe('there');
    });

    it('([prop1, prop2]): should return the specified property values as an object', () => {
      const el = cheerio(
        '<li style="margin: 1px; padding: 2px; color: blue;">',
      );
      expect(el.css(['margin', 'color'])).toStrictEqual({
        margin: '1px',
        color: 'blue',
      });
    });

    it('(prop, val): should set a css property', () => {
      const el = cheerio('<li style="margin: 0;"></li><li></li>');
      el.css('color', 'red');
      expect(el.attr('style')).toBe('margin: 0; color: red;');
      expect(el.eq(1).attr('style')).toBe('color: red;');
    });

    it('(prop, val) : should skip text nodes', () => {
      const $text = load(mixedText);
      const $body = $text($text('body')[0].children);

      $body.css('test', 'value');

      expect($text('body').html()).toBe(
        '<a style="test: value;">1</a>TEXT<b style="test: value;">2</b>',
      );
    });

    it('(prop, ""): should unset a css property', () => {
      const el = cheerio('<li style="padding: 1px; margin: 0;">');
      el.css('padding', '');
      expect(el.attr('style')).toBe('margin: 0;');
    });

    it('(any, val): should ignore unsupported prop types', () => {
      const el = cheerio('<li style="padding: 1px;">');
      el.css(123 as never, 'test');
      expect(el.attr('style')).toBe('padding: 1px;');
    });

    it('(prop): should not mangle embedded urls', () => {
      const el = cheerio(
        '<li style="background-image:url(http://example.com/img.png);">',
      );
      expect(el.css('background-image')).toBe(
        'url(http://example.com/img.png)',
      );
    });

    it('(prop): should ignore blank properties', () => {
      const el = cheerio('<li style=":#ccc;color:#aaa;">');
      expect(el.css()).toStrictEqual({ color: '#aaa' });
    });

    it('(prop): should ignore blank values', () => {
      const el = cheerio('<li style="color:;position:absolute;">');
      expect(el.css()).toStrictEqual({ position: 'absolute' });
    });

    it('(prop): should return undefined for unmatched elements', () => {
      const $ = load('<li style="color:;position:absolute;">');
      expect($('ul').css('background-image')).toBeUndefined();
    });

    it('(prop): should return undefined for unmatched styles', () => {
      const el = cheerio('<li style="color:;position:absolute;">');
      expect(el.css('margin')).toBeUndefined();
    });

    describe('(prop, function):', () => {
      let $el: Cheerio<Element>;
      beforeEach(() => {
        const $ = load(
          '<div style="margin: 0px;"></div><div style="margin: 1px;"></div><div style="margin: 2px;">',
        );
        $el = $('div');
      });

      it('should iterate over the selection', () => {
        let count = 0;
        $el.css('margin', function (idx, value) {
          expect(idx).toBe(count);
          expect(value).toBe(`${count}px`);
          expect(this).toBe($el[count]);
          count++;
          return undefined;
        });
        expect(count).toBe(3);
      });

      it('should set each attribute independently', () => {
        const values = ['4px', '', undefined];
        $el.css('margin', (idx) => values[idx]);
        expect($el.eq(0).attr('style')).toBe('margin: 4px;');
        expect($el.eq(1).attr('style')).toBe('');
        expect($el.eq(2).attr('style')).toBe('margin: 2px;');
      });
    });

    it('(obj): should set each key and val', () => {
      const el = cheerio('<li style="padding: 0;"></li><li></li>');
      el.css({ foo: 0 } as never);
      expect(el.eq(0).attr('style')).toBe('padding: 0; foo: 0;');
      expect(el.eq(1).attr('style')).toBe('foo: 0;');
    });

    describe('parser', () => {
      it('should allow any whitespace between declarations', () => {
        const el = cheerio('<li style="one \t:\n 0;\n two \f\r:\v 1">');
        expect(el.css(['one', 'two', 'five'])).toStrictEqual({
          one: '0',
          two: '1',
        });
      });

      it('should add malformed values to previous field (#1134)', () => {
        const el = cheerio(
          '<button style="background-image: url(data:image/png;base64,iVBORw0KGgo)"></button>',
        );
        expect(el.css('background-image')).toStrictEqual(
          'url(data:image/png;base64,iVBORw0KGgo)',
        );
      });
    });
  });
});
