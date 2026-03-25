import { describe, it, expect, beforeEach } from 'vitest';
import { load, type CheerioAPI, type Cheerio } from '../index.js';
import {
  fruits,
  divcontainers,
  mixedText,
  unwrapspans,
} from '../__fixtures__/fixtures.js';
import type { AnyNode, Element } from 'domhandler';

describe('$(...)', () => {
  let $: CheerioAPI;
  let $fruits: Cheerio<Element>;

  beforeEach(() => {
    $ = load(fruits);
    $fruits = $('#fruits');
  });

  describe('.wrap', () => {
    it('(Cheerio object) : should insert the element and add selected element(s) as its child', () => {
      const $redFruits = $('<div class="red-fruits"></div>');
      $('.apple').wrap($redFruits);

      expect($fruits.children().eq(0).hasClass('red-fruits')).toBe(true);
      expect($('.red-fruits').children().eq(0).hasClass('apple')).toBe(true);
      expect($fruits.children().eq(1).hasClass('orange')).toBe(true);
      expect($redFruits.children()).toHaveLength(1);
    });

    it('(element) : should wrap the base element correctly', () => {
      $('ul').wrap('<a></a>');
      expect($('body').children()[0].tagName).toBe('a');
    });

    it('(document) : should ignore document node', () => {
      $.root().wrap('<a></a>');
      expect($.root()[0]).toHaveProperty('type', 'root');
    });

    it('(element) : should insert the element and add selected element(s) as its child', () => {
      const $redFruits = $('<div class="red-fruits"></div>');
      $('.apple').wrap($redFruits[0]);

      expect($fruits.children()[0]).toBe($redFruits[0]);
      expect($redFruits.children()).toHaveLength(1);
      expect($redFruits.children()[0]).toBe($('.apple')[0]);
      expect($fruits.children()[1]).toBe($('.orange')[0]);
    });

    it('(html) : should insert the markup and add selected element(s) as its child', () => {
      $('.apple').wrap('<div class="red-fruits"> </div>');
      expect($fruits.children().eq(0).hasClass('red-fruits')).toBe(true);
      expect($('.red-fruits').children().eq(0).hasClass('apple')).toBe(true);
      expect($fruits.children().eq(1).hasClass('orange')).toBe(true);
      expect($('.red-fruits').children()).toHaveLength(1);
    });

    it('(html) : discards extraneous markup', () => {
      $('.apple').wrap('<div></div><p></p>');
      expect($('div')).toHaveLength(1);
      expect($('p')).toHaveLength(0);
    });

    it('(html) : wraps with nested elements', () => {
      const $orangeFruits = $(
        '<div class="orange-fruits"><div class="and-stuff"></div></div>',
      );
      $('.orange').wrap($orangeFruits);

      expect($fruits.children().eq(1).hasClass('orange-fruits')).toBe(true);
      expect($('.orange-fruits').children().eq(0).hasClass('and-stuff')).toBe(
        true,
      );
      expect($fruits.children().eq(2).hasClass('pear')).toBe(true);
      expect($('.orange-fruits').children()).toHaveLength(1);
    });

    it('(html) : should only worry about the first tag children', () => {
      const delicious = '<span> This guy is delicious: <b></b></span>';
      $('.apple').wrap(delicious);
      expect($('b>.apple')).toHaveLength(1);
    });

    it('(selector) : wraps the content with a copy of the first matched element', () => {
      $('.apple').wrap('.orange, .pear');

      const $oranges = $('.orange');
      expect($('.pear')).toHaveLength(1);
      expect($oranges).toHaveLength(2);
      expect($oranges.eq(0).parent()[0]).toBe($fruits[0]);
      expect($oranges.eq(0).children()).toHaveLength(1);
      expect($oranges.eq(0).children()[0]).toBe($('.apple')[0]);
      expect($('.apple').parent()[0]).toBe($oranges[0]);
      expect($oranges.eq(1).children()).toHaveLength(0);
    });

    it('(fn) : should invoke the provided function with the correct arguments and context', () => {
      const $children = $fruits.children();
      const args: [number, AnyNode][] = [];
      const thisValues: AnyNode[] = [];

      $children.wrap(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return '';
      });

      expect(args).toStrictEqual([
        [0, $children[0]],
        [1, $children[1]],
        [2, $children[2]],
      ]);
      expect(thisValues).toStrictEqual([
        $children[0],
        $children[1],
        $children[2],
      ]);
    });

    it('(fn) : should use the returned HTML to wrap each element', () => {
      const $children = $fruits.children();
      const tagNames = ['div', 'span', 'p'];

      $children.wrap(() => `<${tagNames.shift()}>`);

      expect($fruits.find('div')).toHaveLength(1);
      expect($fruits.find('div')[0]).toBe($fruits.children()[0]);
      expect($fruits.find('.apple')).toHaveLength(1);
      expect($fruits.find('.apple').parent()[0]).toBe($fruits.find('div')[0]);

      expect($fruits.find('span')).toHaveLength(1);
      expect($fruits.find('span')[0]).toBe($fruits.children()[1]);
      expect($fruits.find('.orange')).toHaveLength(1);
      expect($fruits.find('.orange').parent()[0]).toBe($fruits.find('span')[0]);

      expect($fruits.find('p')).toHaveLength(1);
      expect($fruits.find('p')[0]).toBe($fruits.children()[2]);
      expect($fruits.find('.pear')).toHaveLength(1);
      expect($fruits.find('.pear').parent()[0]).toBe($fruits.find('p')[0]);
    });

    it('(fn) : should use the returned Cheerio object to wrap each element', () => {
      const $children = $fruits.children();
      const tagNames = ['span', 'p', 'div'];

      $children.wrap(() => $(`<${tagNames.shift()}>`));

      expect($fruits.find('span')).toHaveLength(1);
      expect($fruits.find('span')[0]).toBe($fruits.children()[0]);
      expect($fruits.find('.apple')).toHaveLength(1);
      expect($fruits.find('.apple').parent()[0]).toBe($fruits.find('span')[0]);

      expect($fruits.find('p')).toHaveLength(1);
      expect($fruits.find('p')[0]).toBe($fruits.children()[1]);
      expect($fruits.find('.orange')).toHaveLength(1);
      expect($fruits.find('.orange').parent()[0]).toBe($fruits.find('p')[0]);

      expect($fruits.find('div')).toHaveLength(1);
      expect($fruits.find('div')[0]).toBe($fruits.children()[2]);
      expect($fruits.find('.pear')).toHaveLength(1);
      expect($fruits.find('.pear').parent()[0]).toBe($fruits.find('div')[0]);
    });

    it('($(...)) : for each element it should add a wrapper elment and add the selected element as its child', () => {
      const $fruitDecorator = $('<div class="fruit-decorator"></div>');
      $('li').wrap($fruitDecorator);
      expect($fruits.children().eq(0).hasClass('fruit-decorator')).toBe(true);
      expect($fruits.children().eq(0).children().eq(0).hasClass('apple')).toBe(
        true,
      );
      expect($fruits.children().eq(1).hasClass('fruit-decorator')).toBe(true);
      expect($fruits.children().eq(1).children().eq(0).hasClass('orange')).toBe(
        true,
      );
      expect($fruits.children().eq(2).hasClass('fruit-decorator')).toBe(true);
      expect($fruits.children().eq(2).children().eq(0).hasClass('pear')).toBe(
        true,
      );
    });
  });

  describe('.wrapInner', () => {
    it('(Cheerio object) : should insert the element and add selected element(s) as its parent', () => {
      const $container = $('<div class="container"></div>') as Cheerio<Element>;
      $fruits.wrapInner($container);

      expect($fruits.children()[0]).toBe($container[0]);
      expect($container[0].parent).toBe($fruits[0]);
      expect($container[0].children[0]).toBe($('.apple')[0]);
      expect($container[0].children[1]).toBe($('.orange')[0]);
      expect($('.apple')[0].parent).toBe($container[0]);
      expect($fruits.children()).toHaveLength(1);
      expect($container.children()).toHaveLength(3);
    });

    it('(element) : should insert the element and add selected element(s) as its parent', () => {
      const $container = $('<div class="container"></div>') as Cheerio<Element>;
      $fruits.wrapInner($container[0]);

      expect($fruits.children()[0]).toBe($container[0]);
      expect($container[0].parent).toBe($fruits[0]);
      expect($container[0].children[0]).toBe($('.apple')[0]);
      expect($container[0].children[1]).toBe($('.orange')[0]);
      expect($('.apple')[0].parent).toBe($container[0]);
      expect($fruits.children()).toHaveLength(1);
      expect($container.children()).toHaveLength(3);
    });

    it('(html) : should ignore text nodes', () => {
      const $test = load(mixedText);
      $test($test('body')[0].children).wrapInner('<test>');

      expect($test('body').html()).toBe(
        '<a><test>1</test></a>TEXT<b><test>2</test></b>',
      );
    });

    it('(html) : should insert the element and add selected element(s) as its parent', () => {
      $fruits.wrapInner('<div class="container"></div>');

      expect($fruits.children()[0]).toBe($('.container')[0]);
      expect($('.container')[0].parent).toBe($fruits[0]);
      expect($('.container')[0].children[0]).toBe($('.apple')[0]);
      expect($('.container')[0].children[1]).toBe($('.orange')[0]);
      expect($('.apple')[0].parent).toBe($('.container')[0]);
      expect($fruits.children()).toHaveLength(1);
      expect($('.container').children()).toHaveLength(3);
    });

    it("(selector) : should wrap the html of the element with the selector's first match", () => {
      $('.apple').wrapInner('.orange, .pear');
      const $oranges = $('.orange');
      expect($('.pear')).toHaveLength(1);
      expect($oranges).toHaveLength(2);
      expect($oranges.eq(0).parent()[0]).toBe($('.apple')[0]);
      expect($oranges.eq(0).text()).toBe('Apple');
      expect($('.apple').eq(0).children()[0]).toBe($oranges[0]);
      expect($oranges.eq(1).parent()[0]).toBe($fruits[0]);
      expect($oranges.eq(1).text()).toBe('Orange');
    });

    it('(fn) : should invoke the provided function with the correct arguments and context', () => {
      const $children = $fruits.children();
      const args: [number, AnyNode][] = [];
      const thisValues: AnyNode[] = [];

      $children.wrapInner(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return this;
      });

      expect(args).toStrictEqual([
        [0, $children[0]],
        [1, $children[1]],
        [2, $children[2]],
      ]);
      expect(thisValues).toStrictEqual([
        $children[0],
        $children[1],
        $children[2],
      ]);
    });

    it("(fn) : should use the returned HTML to wrap each element's contents", () => {
      const $children = $fruits.children();
      const tagNames = ['div', 'span', 'p'];

      $children.wrapInner(() => `<${tagNames.shift()}>`);

      expect($fruits.find('div')).toHaveLength(1);
      expect($fruits.find('div')[0]).toBe($('.apple').children()[0]);
      expect($fruits.find('.apple')).toHaveLength(1);

      expect($fruits.find('span')).toHaveLength(1);
      expect($fruits.find('span')[0]).toBe($('.orange').children()[0]);
      expect($fruits.find('.orange')).toHaveLength(1);

      expect($fruits.find('p')).toHaveLength(1);
      expect($fruits.find('p')[0]).toBe($('.pear').children()[0]);
      expect($fruits.find('.pear')).toHaveLength(1);
    });

    it("(fn) : should use the returned Cheerio object to wrap each element's contents", () => {
      const $children = $fruits.children();
      const tags = [$('<div></div>'), $('<span></span>'), $('<p></p>')];

      $children.wrapInner(() => tags.shift()!);

      expect($fruits.find('div')).toHaveLength(1);
      expect($fruits.find('div')[0]).toBe($('.apple').children()[0]);
      expect($fruits.find('.apple')).toHaveLength(1);

      expect($fruits.find('span')).toHaveLength(1);
      expect($fruits.find('span')[0]).toBe($('.orange').children()[0]);
      expect($fruits.find('.orange')).toHaveLength(1);

      expect($fruits.find('p')).toHaveLength(1);
      expect($fruits.find('p')[0]).toBe($('.pear').children()[0]);
      expect($fruits.find('.pear')).toHaveLength(1);
    });

    it('($(...)) : for each element it should add a wrapper elment and add the selected element as its child', () => {
      const $fruitDecorator = $('<div class="fruit-decorator"></div>');
      const $children = $fruits.children();
      $('li').wrapInner($fruitDecorator);

      expect($('.fruit-decorator')).toHaveLength(3);
      expect($children.eq(0).children().eq(0).hasClass('fruit-decorator')).toBe(
        true,
      );
      expect($children.eq(0).hasClass('apple')).toBe(true);
      expect($children.eq(1).children().eq(0).hasClass('fruit-decorator')).toBe(
        true,
      );
      expect($children.eq(1).hasClass('orange')).toBe(true);
      expect($children.eq(2).children().eq(0).hasClass('fruit-decorator')).toBe(
        true,
      );
      expect($children.eq(2).hasClass('pear')).toBe(true);
    });

    it('(html) : wraps with nested elements', () => {
      const $badOrangeJoke = $(
        '<div class="orange-you-glad"><div class="i-didnt-say-apple"></div></div>',
      );
      $('.orange').wrapInner($badOrangeJoke);

      expect($('.orange').children().eq(0).hasClass('orange-you-glad')).toBe(
        true,
      );
      expect(
        $('.orange-you-glad').children().eq(0).hasClass('i-didnt-say-apple'),
      ).toBe(true);
      expect($fruits.children().eq(2).hasClass('pear')).toBe(true);
      expect($('.orange-you-glad').children()).toHaveLength(1);
    });

    it('(html) : should only worry about the first tag children', () => {
      const delicious = '<span> This guy is delicious: <b></b></span>';
      $('.apple').wrapInner(delicious);
      expect($('.apple>span>b')).toHaveLength(1);
      expect($('.apple>span>b').text()).toBe('Apple');
    });
  });

  describe('.unwrap', () => {
    let $elem: CheerioAPI;

    beforeEach(() => {
      $elem = load(unwrapspans);
    });

    it('() : should be unwrap span elements', () => {
      const abcd = $elem('#unwrap1 > span, #unwrap2 > span').get();
      const abcdef = $elem('#unwrap span').get();

      // Make #unwrap1 and #unwrap2 go away
      expect(
        $elem('#unwrap1 span').add('#unwrap2 span:first-child').unwrap(),
      ).toHaveLength(3);

      /*
       * .toEqual
       *  all four spans should still exist
       */
      expect($elem('#unwrap > span').get()).toEqual(abcd);

      // Make all b elements in #unwrap3 go away
      expect($elem('#unwrap3 span').unwrap().get()).toEqual(
        $elem('#unwrap3 > span').get(),
      );

      // Make #unwrap3 go away
      expect($elem('#unwrap3 span').unwrap().get()).toEqual(
        $elem('#unwrap > span.unwrap3').get(),
      );

      // #unwrap only contains 6 child spans
      expect($elem('#unwrap').children().get()).toEqual(abcdef);

      // Make the 6 spans become children of body
      expect($elem('#unwrap > span').unwrap().get()).toEqual(
        $elem('body > span.unwrap').get(),
      );

      // Can't unwrap children of body
      expect($elem('body > span.unwrap').unwrap().get()).toEqual(
        $elem('body > span.unwrap').get(),
      );

      // Can't unwrap children of body
      expect($elem('body > span.unwrap').unwrap().get()).toEqual(abcdef);

      // Can't unwrap children of body
      expect($elem('body > span.unwrap').get()).toEqual(abcdef);
    });

    it('(selector) : should only unwrap element parent what specified', () => {
      const abcd = $elem('#unwrap1 > span, #unwrap2 > span').get();

      // Shouldn't unwrap, no match
      $elem('#unwrap1 span').unwrap('#unwrap2');
      expect($elem('#unwrap1')).toHaveLength(1);

      // Shouldn't unwrap, no match
      $elem('#unwrap1 span').unwrap('span');
      expect($elem('#unwrap1')).toHaveLength(1);

      // Unwraps
      $elem('#unwrap1 span').unwrap('#unwrap1');
      expect($elem('#unwrap1')).toHaveLength(0);

      // Should not unwrap - unmatched unwrap
      $elem('#unwrap2 span').unwrap('quote');
      expect($elem('#unwrap > span')).toHaveLength(2);

      // Check return values - matched unwrap
      $elem('#unwrap2 span').unwrap('#unwrap2');
      expect($elem('#unwrap > span').get()).toEqual(abcd);
    });
  });

  describe('.wrapAll', () => {
    let doc: CheerioAPI;
    let $inner: Cheerio<Element>;

    beforeEach(() => {
      doc = load(divcontainers);
      $inner = doc('.inner');
    });

    it('(Cheerio object) : should insert the element and wrap elements with it', () => {
      $inner.wrapAll(doc('#new'));
      const $container = doc('.container');
      const $wrap = doc('b');

      expect($container).toHaveLength(2);
      expect($container[0].children).toHaveLength(1);
      expect($container[1].children).toHaveLength(0);
      expect($container[0].children[0]).toBe(doc('#new')[0]);

      expect($inner).toHaveLength(4);
      expect($wrap[0].children).toHaveLength(4);
      expect($inner[0].parent).toBe($wrap[0]);
      expect($inner[1].parent).toBe($wrap[0]);
      expect($inner[2].parent).toBe($wrap[0]);
      expect($inner[3].parent).toBe($wrap[0]);
    });

    it('(html) : should wrap elements with it', () => {
      $inner.wrapAll('<div class="wrap"></div>');
      const $container = doc('.container');
      const $wrap = doc('.wrap');

      expect($inner).toHaveLength(4);
      expect($container).toHaveLength(2);
      expect($wrap).toHaveLength(1);
      expect($wrap[0].children).toHaveLength(4);
      expect($container[0].children).toHaveLength(1);
      expect($container[1].children).toHaveLength(0);
      expect($inner[0].parent).toBe($wrap[0]);
      expect($inner[1].parent).toBe($wrap[0]);
      expect($inner[2].parent).toBe($wrap[0]);
      expect($inner[3].parent).toBe($wrap[0]);
      expect($wrap[0].parent).toBe($container[0]);
      expect($container[0].children[0]).toBe($wrap[0]);
    });

    it('(html) : should wrap single element with it', () => {
      const parent = doc('<p>').wrapAll('<div></div>').parent();
      expect(parent).toHaveLength(1);
      expect(parent.is('div')).toBe(true);
    });

    it('(selector) : should find element from dom, wrap elements with it', () => {
      $inner.wrapAll('#new');
      const $container = doc('.container');
      const $wrap = doc('b');
      const $new = doc('#new');

      expect($inner).toHaveLength(4);
      expect($container).toHaveLength(2);
      expect($container[0].children).toHaveLength(1);
      expect($container[1].children).toHaveLength(0);
      expect($wrap[0].children).toHaveLength(4);
      expect($inner[0].parent).toBe($wrap[0]);
      expect($inner[1].parent).toBe($wrap[0]);
      expect($inner[2].parent).toBe($wrap[0]);
      expect($inner[3].parent).toBe($wrap[0]);
      expect($new[0].parent).toBe($container[0]);
      expect($container[0].children[0]).toBe($new[0]);
    });

    it('(function) : check execution', () => {
      const $container = doc('.container');
      const p = $container[0].parent;

      const result = $container.wrapAll(
        () => "<div class='red'><div class='tmp'></div></div>",
      );

      expect(result.parent()).toHaveLength(1);
      expect($container.eq(0).parent().parent().is('.red')).toBe(true);
      expect($container.eq(1).parent().parent().is('.red')).toBe(true);
      expect($container.eq(0).parent().parent().parent().is(p)).toBe(true);
    });

    it('(function) : check execution characteristics', () => {
      const $new = doc('#new');
      let i = 0;

      doc('no-result').wrapAll(() => {
        i++;
        return '';
      });
      expect(i).toBeFalsy();

      $new.wrapAll(function (index) {
        expect(this).toBe($new[0]);
        expect(index).toBe(0);
        return this;
      });
    });

    it('(nodes) : should skip text nodes', () => {
      const $text = load(mixedText);
      const $body = $text($text('body')[0].children);

      $body.wrapAll($text('body')[0].children.slice(1));

      expect($text('body').html()).toBe('TEXT<b>2<a>1</a>TEXT<b>2</b></b>');
    });
  });

  describe('.append', () => {
    it('() : should do nothing', () => {
      expect($('#fruits').append()[0].tagName).toBe('ul');
    });

    it('(null) :  should do nothing', () => {
      $fruits.append(null as never);
      expect($fruits.children()).toHaveLength(3);
    });

    it('(html) : should add element as last child', () => {
      $fruits.append('<li class="plum">Plum</li>');
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(html) : should not fail on text nodes', () => {
      expect($(mixedText).append(' UP').html()).toBe('1 UP');
    });

    it('($(...)) : should add element as last child', () => {
      const $plum = $('<li class="plum">Plum</li>');
      $fruits.append($plum);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(Node) : should add element as last child', () => {
      const plum = $('<li class="plum">Plum</li>')[0];
      $fruits.append(plum);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(existing Node) : should remove node from previous location', () => {
      const apple = $fruits.children()[0];

      expect($fruits.children()).toHaveLength(3);
      $fruits.append(apple);
      const $children = $fruits.children();

      expect($children).toHaveLength(3);
      expect($children[0]).not.toBe(apple);
      expect($children[2]).toBe(apple);
    });

    it('(existing Node) : should remove existing node from previous location', () => {
      const apple = $fruits.children()[0];
      const $dest = $('<div></div>');

      expect($fruits.children()).toHaveLength(3);
      $dest.append(apple);
      const $children = $fruits.children();

      expect($children).toHaveLength(2);
      expect($children[0]).not.toBe(apple);

      expect($dest.children()).toHaveLength(1);
      expect($dest.children()[0]).toBe(apple);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.pear').append($('.orange'));
      expect($('.apple').next()[0]).toBe($('.pear')[0]);
      expect($('.pear').prev()[0]).toBe($('.apple')[0]);
    });

    it('(existing Node) : should clone all but the last occurrence', () => {
      const $originalApple = $('.apple');

      $('.orange, .pear').append($originalApple);

      const $apples = $('.apple');
      expect($apples).toHaveLength(2);
      expect($apples.eq(0).parent()[0]).toBe($('.orange')[0]);
      expect($apples.eq(1).parent()[0]).toBe($('.pear')[0]);
      expect($apples[1]).toBe($originalApple[0]);
    });

    it('(elem) : should NOP if removed', () => {
      const $apple = $('.apple');

      $apple.remove();
      $fruits.append($apple);
      expect($fruits.children().eq(2).hasClass('apple')).toBe(true);
    });

    it('($(...), html) : should add multiple elements as last children', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const grape = '<li class="grape">Grape</li>';
      $fruits.append($plum, grape);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(4).hasClass('grape')).toBe(true);
    });

    it('(Array) : should append all elements in the array', () => {
      const more = $(
        '<li class="plum">Plum</li><li class="grape">Grape</li>',
      ).get();
      $fruits.append(more);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(4).hasClass('grape')).toBe(true);
    });

    it('(fn) : should invoke the callback with the correct arguments and context', () => {
      const $fruits = $('#fruits').children();
      const args: [number, string][] = [];
      const thisValues: AnyNode[] = [];

      $fruits.append(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return this;
      });

      expect(args).toStrictEqual([
        [0, 'Apple'],
        [1, 'Orange'],
        [2, 'Pear'],
      ]);
      expect(thisValues).toStrictEqual([$fruits[0], $fruits[1], $fruits[2]]);
    });

    it('(fn) : should add returned string as last child', () => {
      const $fruits = $('#fruits').children();

      $fruits.append(() => '<div class="first">');

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.first')[0]).toBe($apple.contents()[1]);
      expect($orange.find('.first')[0]).toBe($orange.contents()[1]);
      expect($pear.find('.first')[0]).toBe($pear.contents()[1]);
    });

    it('(fn) : should add returned Cheerio object as last child', () => {
      const $fruits = $('#fruits').children();

      $fruits.append(() => $('<div class="second">'));

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.second')[0]).toBe($apple.contents()[1]);
      expect($orange.find('.second')[0]).toBe($orange.contents()[1]);
      expect($pear.find('.second')[0]).toBe($pear.contents()[1]);
    });

    it('(fn) : should add returned Node as last child', () => {
      const $fruits = $('#fruits').children();

      $fruits.append(() => $('<div class="third">')[0]);

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.third')[0]).toBe($apple.contents()[1]);
      expect($orange.find('.third')[0]).toBe($orange.contents()[1]);
      expect($pear.find('.third')[0]).toBe($pear.contents()[1]);
    });

    it('should maintain correct object state (Issue: #10)', () => {
      const $obj = $('<div></div>')
        .append('<div><div></div></div>')
        .children()
        .children()
        .parent();
      expect($obj).toBeTruthy();
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const { parent } = $plum[0];
      expect(parent).toBeTruthy();

      $fruits.append($plum);
      expect($plum[0].parent?.type).not.toBe('root');
      expect(parent?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.prepend', () => {
    it('() : should do nothing', () => {
      expect($('#fruits').prepend()[0].tagName).toBe('ul');
    });

    it('(html) : should add element as first child', () => {
      $fruits.prepend('<li class="plum">Plum</li>');
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('($(...)) : should add element as first child', () => {
      const $plum = $('<li class="plum">Plum</li>');
      $fruits.prepend($plum);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('($(...)) : should add style element as first child', () => {
      const $style = $('<style>.foo {}</style>');
      $fruits.prepend($style);
      const styleTag = $fruits.children().get(0);
      expect(styleTag?.tagName).toBe('style');
      expect(styleTag?.children[0]).toHaveProperty('data', '.foo {}');
    });

    it('($(...)) : should add script element as first child', () => {
      const $script = $('<script>var foo;</script>');
      $fruits.prepend($script);
      const scriptTag = $fruits.children().get(0);
      expect(scriptTag?.tagName).toBe('script');
      expect(scriptTag?.children[0]).toHaveProperty('data', 'var foo;');
    });

    it('(Node) : should add node as first child', () => {
      const plum = $('<li class="plum">Plum</li>')[0];
      $fruits.prepend(plum);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('(existing Node) : should remove existing nodes from previous locations', () => {
      const pear = $fruits.children()[2];

      expect($fruits.children()).toHaveLength(3);
      $fruits.prepend(pear);
      const $children = $fruits.children();

      expect($children).toHaveLength(3);
      expect($children[2]).not.toBe(pear);
      expect($children[0]).toBe(pear);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.pear').prepend($('.orange'));
      expect($('.apple').next()[0]).toBe($('.pear')[0]);
      expect($('.pear').prev()[0]).toBe($('.apple')[0]);
    });

    it('(existing Node) : should clone all but the last occurrence', () => {
      const $originalApple = $('.apple');

      $('.orange, .pear').prepend($originalApple);

      const $apples = $('.apple');
      expect($apples).toHaveLength(2);
      expect($apples.eq(0).parent()[0]).toBe($('.orange')[0]);
      expect($apples.eq(1).parent()[0]).toBe($('.pear')[0]);
      expect($apples[1]).toBe($originalApple[0]);
    });

    it('(elem) : should handle if removed', () => {
      const $apple = $('.apple');

      $apple.remove();
      $fruits.prepend($apple);
      expect($fruits.children().eq(0).hasClass('apple')).toBe(true);
    });

    it('(Array) : should add all elements in the array as initial children', () => {
      const more = $(
        '<li class="plum">Plum</li><li class="grape">Grape</li>',
      ).get();
      $fruits.prepend(more);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(1).hasClass('grape')).toBe(true);
    });

    it('(html, $(...), html) : should add multiple elements as first children', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const grape = '<li class="grape">Grape</li>';
      $fruits.prepend($plum, grape);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(1).hasClass('grape')).toBe(true);
    });

    it('(fn) : should invoke the callback with the correct arguments and context', () => {
      const args: [number, string][] = [];
      const thisValues: AnyNode[] = [];
      const $fruits = $('#fruits').children();

      $fruits.prepend(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return this;
      });

      expect(args).toStrictEqual([
        [0, 'Apple'],
        [1, 'Orange'],
        [2, 'Pear'],
      ]);
      expect(thisValues).toStrictEqual([$fruits[0], $fruits[1], $fruits[2]]);
    });

    it('(fn) : should add returned string as first child', () => {
      const $fruits = $('#fruits').children();

      $fruits.prepend(() => '<div class="first">');

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.first')[0]).toBe($apple.contents()[0]);
      expect($orange.find('.first')[0]).toBe($orange.contents()[0]);
      expect($pear.find('.first')[0]).toBe($pear.contents()[0]);
    });

    it('(fn) : should add returned Cheerio object as first child', () => {
      const $fruits = $('#fruits').children();

      $fruits.prepend(() => $('<div class="second">'));

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.second')[0]).toBe($apple.contents()[0]);
      expect($orange.find('.second')[0]).toBe($orange.contents()[0]);
      expect($pear.find('.second')[0]).toBe($pear.contents()[0]);
    });

    it('(fn) : should add returned Node as first child', () => {
      const $fruits = $('#fruits').children();

      $fruits.prepend(() => $('<div class="third">')[0]);

      const $apple = $fruits.eq(0);
      const $orange = $fruits.eq(1);
      const $pear = $fruits.eq(2);

      expect($apple.find('.third')[0]).toBe($apple.contents()[0]);
      expect($orange.find('.third')[0]).toBe($orange.contents()[0]);
      expect($pear.find('.third')[0]).toBe($pear.contents()[0]);
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const root = $plum[0].parent;
      expect(root?.type).toBe('root');

      $fruits.prepend($plum);
      expect($plum[0].parent?.type).not.toBe('root');
      expect(root?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.appendTo', () => {
    it('(html) : should add element as last child', () => {
      const $plum = $('<li class="plum">Plum</li>').appendTo(fruits);
      expect($plum.parent().children().eq(3).hasClass('plum')).toBe(true);
    });

    it('($(...)) : should add element as last child', () => {
      $('<li class="plum">Plum</li>').appendTo($fruits);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(Node) : should add element as last child', () => {
      $('<li class="plum">Plum</li>').appendTo($fruits[0]);
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(selector) : should add element as last child', () => {
      $('<li class="plum">Plum</li>').appendTo('#fruits');
      expect($fruits.children().eq(3).hasClass('plum')).toBe(true);
    });

    it('(Array) : should add element as last child of all elements in the array', () => {
      const $multiple = $('<ul><li>Apple</li></ul><ul><li>Orange</li></ul>');
      $('<li class="plum">Plum</li>').appendTo($multiple.get());
      expect($multiple.first().children().eq(1).hasClass('plum')).toBe(true);
      expect($multiple.last().children().eq(1).hasClass('plum')).toBe(true);
    });
  });

  describe('.prependTo', () => {
    it('(html) : should add element as first child', () => {
      const $plum = $('<li class="plum">Plum</li>').prependTo(fruits);
      expect($plum.parent().children().eq(0).hasClass('plum')).toBe(true);
    });

    it('($(...)) : should add element as first child', () => {
      $('<li class="plum">Plum</li>').prependTo($fruits);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('(Node) : should add node as first child', () => {
      $('<li class="plum">Plum</li>').prependTo($fruits[0]);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('(selector) : should add element as first child', () => {
      $('<li class="plum">Plum</li>').prependTo('#fruits');
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
    });

    it('(Array) : should add element as first child of all elements in the array', () => {
      const $multiple = $('<ul><li>Apple</li></ul><ul><li>Orange</li></ul>');
      $('<li class="plum">Plum</li>').prependTo($multiple.get());
      expect($multiple.first().children().eq(0).hasClass('plum')).toBe(true);
      expect($multiple.last().children().eq(0).hasClass('plum')).toBe(true);
    });
  });

  describe('.after', () => {
    it('() : should do nothing', () => {
      expect($fruits.after()[0].tagName).toBe('ul');
    });

    it('(html) : should add element as next sibling', () => {
      const grape = '<li class="grape">Grape</li>';
      $('.apple').after(grape);
      expect($('.apple').next().hasClass('grape')).toBe(true);
    });

    it('(Array) : should add all elements in the array as next sibling', () => {
      const more = $(
        '<li class="plum">Plum</li><li class="grape">Grape</li>',
      ).get();
      $('.apple').after(more);
      expect($fruits.children().eq(1).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(2).hasClass('grape')).toBe(true);
    });

    it('($(...)) : should add element as next sibling', () => {
      const $plum = $('<li class="plum">Plum</li>');
      $('.apple').after($plum);
      expect($('.apple').next().hasClass('plum')).toBe(true);
    });

    it('(Node) : should add element as next sibling', () => {
      const plum = $('<li class="plum">Plum</li>')[0];
      $('.apple').after(plum);
      expect($('.apple').next().hasClass('plum')).toBe(true);
    });

    it('(existing Node) : should remove existing nodes from previous locations', () => {
      const pear = $fruits.children()[2];

      $('.apple').after(pear);

      const $children = $fruits.children();
      expect($children).toHaveLength(3);
      expect($children[1]).toBe(pear);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.pear').after($('.orange'));
      expect($('.apple').next()[0]).toBe($('.pear')[0]);
      expect($('.pear').prev()[0]).toBe($('.apple')[0]);
    });

    it('(existing Node) : should clone all but the last occurrence', () => {
      const $originalApple = $('.apple');
      $('.orange, .pear').after($originalApple);

      expect($('.apple')).toHaveLength(2);
      expect($('.apple').eq(0).prev()[0]).toBe($('.orange')[0]);
      expect($('.apple').eq(0).next()[0]).toBe($('.pear')[0]);
      expect($('.apple').eq(1).prev()[0]).toBe($('.pear')[0]);
      expect($('.apple').eq(1).next()).toHaveLength(0);
      expect($('.apple')[0]).not.toStrictEqual($originalApple[0]);
      expect($('.apple')[1]).toStrictEqual($originalApple[0]);
    });

    it('(elem) : should handle if removed', () => {
      const $apple = $('.apple');
      const $plum = $('<li class="plum">Plum</li>');

      $apple.remove();
      $apple.after($plum);
      expect($plum.prev()).toHaveLength(0);
    });

    it('($(...), html) : should add multiple elements as next siblings', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const grape = '<li class="grape">Grape</li>';
      $('.apple').after($plum, grape);
      expect($('.apple').next().hasClass('plum')).toBe(true);
      expect($('.plum').next().hasClass('grape')).toBe(true);
    });

    it('(fn) : should invoke the callback with the correct arguments and context', () => {
      const args: [number, string][] = [];
      const thisValues: AnyNode[] = [];
      const $fruits = $('#fruits').children();

      $fruits.after(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return this;
      });

      expect(args).toStrictEqual([
        [0, 'Apple'],
        [1, 'Orange'],
        [2, 'Pear'],
      ]);
      expect(thisValues).toStrictEqual([$fruits[0], $fruits[1], $fruits[2]]);
    });

    it('(fn) : should add returned string as next sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.after(() => '<li class="first">');

      expect($('.first')[0]).toBe($('#fruits').contents()[1]);
      expect($('.first')[1]).toBe($('#fruits').contents()[3]);
      expect($('.first')[2]).toBe($('#fruits').contents()[5]);
    });

    it('(fn) : should add returned Cheerio object as next sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.after(() => $('<li class="second">'));

      expect($('.second')[0]).toBe($('#fruits').contents()[1]);
      expect($('.second')[1]).toBe($('#fruits').contents()[3]);
      expect($('.second')[2]).toBe($('#fruits').contents()[5]);
    });

    it('(fn) : should add returned element as next sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.after(() => $('<li class="third">')[0]);

      expect($('.third')[0]).toBe($('#fruits').contents()[1]);
      expect($('.third')[1]).toBe($('#fruits').contents()[3]);
      expect($('.third')[2]).toBe($('#fruits').contents()[5]);
    });

    it('(fn) : should support text nodes', () => {
      const $text = load(mixedText);

      $text($text('body')[0].children).after(
        (_, content) => `<c>${content}added</c>`,
      );

      expect($text('body').html()).toBe(
        '<a>1</a><c>1added</c>TEXT<b>2</b><c>2added</c>',
      );
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const root = $plum[0].parent;
      expect(root?.type).toBe('root');

      $fruits.after($plum);
      expect($plum[0].parent?.type).not.toBe('root');
      expect(root?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.insertAfter', () => {
    it('(selector) : should create element and add as next sibling', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertAfter('.apple');
      expect($('.apple').next().hasClass('grape')).toBe(true);
    });

    it('(selector) : should create element and add as next sibling of multiple elements', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertAfter('.apple, .pear');
      expect($('.apple').next().hasClass('grape')).toBe(true);
      expect($('.pear').next().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create element and add as next sibling', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertAfter($('.apple'));
      expect($('.apple').next().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create element and add as next sibling of multiple elements', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertAfter($('.apple, .pear'));
      expect($('.apple').next().hasClass('grape')).toBe(true);
      expect($('.pear').next().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create all elements in the array and add as next siblings', () => {
      const more = $('<li class="plum">Plum</li><li class="grape">Grape</li>');
      more.insertAfter($('.apple'));
      expect($fruits.children().eq(0).hasClass('apple')).toBe(true);
      expect($fruits.children().eq(1).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(2).hasClass('grape')).toBe(true);
    });

    it('(existing Node) : should remove existing nodes from previous locations', () => {
      $('.orange').insertAfter('.pear');
      expect($fruits.children().eq(1).hasClass('orange')).toBe(false);
      expect($fruits.children().length).toBe(3);
      expect($('.orange').length).toBe(1);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.orange').insertAfter('.pear');
      expect($('.apple').next().hasClass('pear')).toBe(true);
      expect($('.pear').prev().hasClass('apple')).toBe(true);
      expect($('.pear').next().hasClass('orange')).toBe(true);
      expect($('.orange').next()).toHaveLength(0);
    });

    it('(existing Node) : should update original direct siblings of multiple elements', () => {
      $('.apple').insertAfter('.orange, .pear');
      expect($('.orange').prev()).toHaveLength(0);
      expect($('.orange').next().hasClass('apple')).toBe(true);
      expect($('.pear').next().hasClass('apple')).toBe(true);
      expect($('.pear').prev().hasClass('apple')).toBe(true);
      expect($fruits.children().length).toBe(4);
      const apples = $('.apple');
      expect(apples.length).toBe(2);
      expect(apples.eq(0).prev().hasClass('orange')).toBe(true);
      expect(apples.eq(1).prev().hasClass('pear')).toBe(true);
    });

    it('(elem) : should handle if removed', () => {
      const $apple = $('.apple');
      const $plum = $('<li class="plum">Plum</li>');
      $apple.remove();
      $plum.insertAfter($apple);
      expect($plum.prev()).toHaveLength(0);
    });

    it('(single) should return the new element for chaining', () => {
      const $grape = $('<li class="grape">Grape</li>').insertAfter('.apple');
      expect($grape.cheerio).toBeTruthy();
      expect($grape.each).toBeTruthy();
      expect($grape.length).toBe(1);
      expect($grape.hasClass('grape')).toBe(true);
    });

    it('(single) should return the new elements for chaining', () => {
      const $purple = $(
        '<li class="grape">Grape</li><li class="plum">Plum</li>',
      ).insertAfter('.apple');
      expect($purple.cheerio).toBeTruthy();
      expect($purple.each).toBeTruthy();
      expect($purple.length).toBe(2);
      expect($purple.eq(0).hasClass('grape')).toBe(true);
      expect($purple.eq(1).hasClass('plum')).toBe(true);
    });

    it('(multiple) should return the new elements for chaining', () => {
      const $purple = $(
        '<li class="grape">Grape</li><li class="plum">Plum</li>',
      ).insertAfter('.apple, .pear');
      expect($purple.cheerio).toBeTruthy();
      expect($purple.each).toBeTruthy();
      expect($purple.length).toBe(4);
      expect($purple.eq(0).hasClass('grape')).toBe(true);
      expect($purple.eq(1).hasClass('plum')).toBe(true);
      expect($purple.eq(2).hasClass('grape')).toBe(true);
      expect($purple.eq(3).hasClass('plum')).toBe(true);
    });

    it('(single) should return the existing element for chaining', () => {
      const $pear = $('.pear').insertAfter('.apple');
      expect($pear.cheerio).toBeTruthy();
      expect($pear.each).toBeTruthy();
      expect($pear.length).toBe(1);
      expect($pear.hasClass('pear')).toBe(true);
    });

    it('(single) should return the existing elements for chaining', () => {
      const $things = $('.orange, .apple').insertAfter('.pear');
      expect($things.cheerio).toBeTruthy();
      expect($things.each).toBeTruthy();
      expect($things.length).toBe(2);
      expect($things.eq(0).hasClass('apple')).toBe(true);
      expect($things.eq(1).hasClass('orange')).toBe(true);
    });

    it('(multiple) should return the existing elements for chaining', () => {
      $('<li class="grape">Grape</li>').insertAfter('.apple');
      const $things = $('.orange, .apple').insertAfter('.pear, .grape');
      expect($things.cheerio).toBeTruthy();
      expect($things.each).toBeTruthy();
      expect($things.length).toBe(4);
      expect($things.eq(0).hasClass('apple')).toBe(true);
      expect($things.eq(1).hasClass('orange')).toBe(true);
      expect($things.eq(2).hasClass('apple')).toBe(true);
      expect($things.eq(3).hasClass('orange')).toBe(true);
    });
  });

  describe('.before', () => {
    it('() : should do nothing', () => {
      expect($('#fruits').before()[0].tagName).toBe('ul');
    });

    it('(html) : should add element as previous sibling', () => {
      const grape = '<li class="grape">Grape</li>';
      $('.apple').before(grape);
      expect($('.apple').prev().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should add element as previous sibling', () => {
      const $plum = $('<li class="plum">Plum</li>');
      $('.apple').before($plum);
      expect($('.apple').prev().hasClass('plum')).toBe(true);
    });

    it('(Node) : should add element as previous sibling', () => {
      const plum = $('<li class="plum">Plum</li>')[0];
      $('.apple').before(plum);
      expect($('.apple').prev().hasClass('plum')).toBe(true);
    });

    it('(existing Node) : should remove existing nodes from previous locations', () => {
      const pear = $fruits.children()[2];

      $('.apple').before(pear);

      const $children = $fruits.children();
      expect($children).toHaveLength(3);
      expect($children[0]).toBe(pear);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.apple').before($('.orange'));
      expect($('.apple').next()[0]).toBe($('.pear')[0]);
      expect($('.pear').prev()[0]).toBe($('.apple')[0]);
    });

    it('(existing Node) : should clone all but the last occurrence', () => {
      const $originalPear = $('.pear');
      $('.apple, .orange').before($originalPear);

      expect($('.pear')).toHaveLength(2);
      expect($('.pear').eq(0).prev()).toHaveLength(0);
      expect($('.pear').eq(0).next()[0]).toBe($('.apple')[0]);
      expect($('.pear').eq(1).prev()[0]).toBe($('.apple')[0]);
      expect($('.pear').eq(1).next()[0]).toBe($('.orange')[0]);
      expect($('.pear')[0]).not.toStrictEqual($originalPear[0]);
      expect($('.pear')[1]).toStrictEqual($originalPear[0]);
    });

    it('(elem) : should handle if removed', () => {
      const $apple = $('.apple');
      const $plum = $('<li class="plum">Plum</li>');

      $apple.remove();
      $apple.before($plum);
      expect($plum.next()).toHaveLength(0);
    });

    it('(Array) : should add all elements in the array as previous sibling', () => {
      const more = $(
        '<li class="plum">Plum</li><li class="grape">Grape</li>',
      ).get();
      $('.apple').before(more);
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(1).hasClass('grape')).toBe(true);
    });

    it('($(...), html) : should add multiple elements as previous siblings', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const grape = '<li class="grape">Grape</li>';
      $('.apple').before($plum, grape);
      expect($('.apple').prev().hasClass('grape')).toBe(true);
      expect($('.grape').prev().hasClass('plum')).toBe(true);
    });

    it('(fn) : should invoke the callback with the correct arguments and context', () => {
      const args: [number, string][] = [];
      const thisValues: AnyNode[] = [];
      const $fruits = $('#fruits').children();

      $fruits.before(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return this;
      });

      expect(args).toStrictEqual([
        [0, 'Apple'],
        [1, 'Orange'],
        [2, 'Pear'],
      ]);
      expect(thisValues).toStrictEqual([$fruits[0], $fruits[1], $fruits[2]]);
    });

    it('(fn) : should add returned string as previous sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.before(() => '<li class="first">');

      expect($('.first')[0]).toBe($('#fruits').contents()[0]);
      expect($('.first')[1]).toBe($('#fruits').contents()[2]);
      expect($('.first')[2]).toBe($('#fruits').contents()[4]);
    });

    it('(fn) : should add returned Cheerio object as previous sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.before(() => $('<li class="second">'));

      expect($('.second')[0]).toBe($('#fruits').contents()[0]);
      expect($('.second')[1]).toBe($('#fruits').contents()[2]);
      expect($('.second')[2]).toBe($('#fruits').contents()[4]);
    });

    it('(fn) : should add returned Node as previous sibling', () => {
      const $fruits = $('#fruits').children();

      $fruits.before(() => $('<li class="third">')[0]);

      expect($('.third')[0]).toBe($('#fruits').contents()[0]);
      expect($('.third')[1]).toBe($('#fruits').contents()[2]);
      expect($('.third')[2]).toBe($('#fruits').contents()[4]);
    });

    it('(fn) : should support text nodes', () => {
      const $text = load(mixedText);

      $text($text('body')[0].children).before(
        (_, content) => `<c>${content}added</c>`,
      );

      expect($text('body').html()).toBe(
        '<c>1added</c><a>1</a>TEXT<c>2added</c><b>2</b>',
      );
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const root = $plum[0].parent;
      expect(root?.type).toBe('root');

      $fruits.before($plum);
      expect($plum[0].parent?.type).not.toBe('root');
      expect(root?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.insertBefore', () => {
    it('(selector) : should create element and add as prev sibling', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertBefore('.apple');
      expect($('.apple').prev().hasClass('grape')).toBe(true);
    });

    it('(selector) : should create element and add as prev sibling of multiple elements', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertBefore('.apple, .pear');
      expect($('.apple').prev().hasClass('grape')).toBe(true);
      expect($('.pear').prev().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create element and add as prev sibling', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertBefore($('.apple'));
      expect($('.apple').prev().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create element and add as next sibling of multiple elements', () => {
      const grape = $('<li class="grape">Grape</li>');
      grape.insertBefore($('.apple, .pear'));
      expect($('.apple').prev().hasClass('grape')).toBe(true);
      expect($('.pear').prev().hasClass('grape')).toBe(true);
    });

    it('($(...)) : should create all elements in the array and add as prev siblings', () => {
      const more = $('<li class="plum">Plum</li><li class="grape">Grape</li>');
      more.insertBefore($('.apple'));
      expect($fruits.children().eq(0).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(1).hasClass('grape')).toBe(true);
      expect($fruits.children().eq(2).hasClass('apple')).toBe(true);
    });

    it('(existing Node) : should remove existing nodes from previous locations', () => {
      $('.pear').insertBefore('.apple');
      expect($fruits.children().eq(2).hasClass('pear')).toBe(false);
      expect($fruits.children().length).toBe(3);
      expect($('.pear').length).toBe(1);
    });

    it('(existing Node) : should update original direct siblings', () => {
      $('.pear').insertBefore('.apple');
      expect($('.apple').prev().hasClass('pear')).toBe(true);
      expect($('.apple').next().hasClass('orange')).toBe(true);
      expect($('.pear').next().hasClass('apple')).toBe(true);
      expect($('.pear').prev()).toHaveLength(0);
    });

    it('(existing Node) : should update original direct siblings of multiple elements', () => {
      $('.pear').insertBefore('.apple, .orange');
      expect($('.apple').prev().hasClass('pear')).toBe(true);
      expect($('.apple').next().hasClass('pear')).toBe(true);
      expect($('.orange').prev().hasClass('pear')).toBe(true);
      expect($('.orange').next()).toHaveLength(0);
      expect($fruits.children().length).toBe(4);
      const pears = $('.pear');
      expect(pears.length).toBe(2);
      expect(pears.eq(0).next().hasClass('apple')).toBe(true);
      expect(pears.eq(1).next().hasClass('orange')).toBe(true);
    });

    it('(elem) : should handle if removed', () => {
      const $apple = $('.apple');
      const $plum = $('<li class="plum">Plum</li>');

      $apple.remove();
      $plum.insertBefore($apple);
      expect($plum.next()).toHaveLength(0);
    });

    it('(single) should return the new element for chaining', () => {
      const $grape = $('<li class="grape">Grape</li>').insertBefore('.apple');
      expect($grape.cheerio).toBeTruthy();
      expect($grape.each).toBeTruthy();
      expect($grape.length).toBe(1);
      expect($grape.hasClass('grape')).toBe(true);
    });

    it('(single) should return the new elements for chaining', () => {
      const $purple = $(
        '<li class="grape">Grape</li><li class="plum">Plum</li>',
      ).insertBefore('.apple');
      expect($purple.cheerio).toBeTruthy();
      expect($purple.each).toBeTruthy();
      expect($purple.length).toBe(2);
      expect($purple.eq(0).hasClass('grape')).toBe(true);
      expect($purple.eq(1).hasClass('plum')).toBe(true);
    });

    it('(multiple) should return the new elements for chaining', () => {
      const $purple = $(
        '<li class="grape">Grape</li><li class="plum">Plum</li>',
      ).insertBefore('.apple, .pear');
      expect($purple.cheerio).toBeTruthy();
      expect($purple.each).toBeTruthy();
      expect($purple.length).toBe(4);
      expect($purple.eq(0).hasClass('grape')).toBe(true);
      expect($purple.eq(1).hasClass('plum')).toBe(true);
      expect($purple.eq(2).hasClass('grape')).toBe(true);
      expect($purple.eq(3).hasClass('plum')).toBe(true);
    });

    it('(single) should return the existing element for chaining', () => {
      const $orange = $('.orange').insertBefore('.apple');
      expect($orange.cheerio).toBeTruthy();
      expect($orange.each).toBeTruthy();
      expect($orange.length).toBe(1);
      expect($orange.hasClass('orange')).toBe(true);
    });

    it('(single) should return the existing elements for chaining', () => {
      const $things = $('.orange, .pear').insertBefore('.apple');
      expect($things.cheerio).toBeTruthy();
      expect($things.each).toBeTruthy();
      expect($things.length).toBe(2);
      expect($things.eq(0).hasClass('orange')).toBe(true);
      expect($things.eq(1).hasClass('pear')).toBe(true);
    });

    it('(multiple) should return the existing elements for chaining', () => {
      $('<li class="grape">Grape</li>').insertBefore('.apple');
      const $things = $('.orange, .apple').insertBefore('.pear, .grape');
      expect($things.cheerio).toBeTruthy();
      expect($things.each).toBeTruthy();
      expect($things.length).toBe(4);
      expect($things.eq(0).hasClass('apple')).toBe(true);
      expect($things.eq(1).hasClass('orange')).toBe(true);
      expect($things.eq(2).hasClass('apple')).toBe(true);
      expect($things.eq(3).hasClass('orange')).toBe(true);
    });
  });

  describe('.remove', () => {
    it('() : should remove selected elements', () => {
      $('.apple').remove();
      expect($fruits.find('.apple')).toHaveLength(0);
    });

    it('() : should be reentrant', () => {
      const $apple = $('.apple');
      $apple.remove();
      $apple.remove();
      expect($fruits.find('.apple')).toHaveLength(0);
    });

    it('(selector) : should remove matching selected elements', () => {
      $('li').remove('.apple');
      expect($fruits.find('.apple')).toHaveLength(0);
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const root = $plum[0].parent;
      expect(root?.type).toBe('root');

      $plum.remove();
      expect($plum[0].parent).toBe(null);
      expect(root?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.replaceWith', () => {
    it('(elem) : should replace one <li> tag with another', () => {
      const $plum = $('<li class="plum">Plum</li>');
      $('.orange').replaceWith($plum);
      expect($('.apple').next().hasClass('plum')).toBe(true);
      expect($('.apple').next().html()).toBe('Plum');
      expect($('.pear').prev().hasClass('plum')).toBe(true);
      expect($('.pear').prev().html()).toBe('Plum');
    });

    it('(Array) : should replace one <li> tag with the elements in the array', () => {
      const more = $(
        '<li class="plum">Plum</li><li class="grape">Grape</li>',
      ).get();
      $('.orange').replaceWith(more);

      expect($fruits.children().eq(1).hasClass('plum')).toBe(true);
      expect($fruits.children().eq(2).hasClass('grape')).toBe(true);
      expect($('.apple').next().hasClass('plum')).toBe(true);
      expect($('.pear').prev().hasClass('grape')).toBe(true);
      expect($fruits.children()).toHaveLength(4);
    });

    it('(Node) : should replace the selected element with given node', () => {
      const $src = $('<h2>hi <span>there</span></h2>');
      const $new = $('<ul></ul>');
      const $replaced = $src.find('span').replaceWith($new[0]);
      expect($new[0].parentNode).toBe($src[0]);
      expect($replaced[0].parentNode).toBe(null);
      expect($.html($src)).toBe('<h2>hi <ul></ul></h2>');
    });

    it('(existing element) : should remove element from its previous location', () => {
      $('.pear').replaceWith($('.apple'));
      expect($fruits.children()).toHaveLength(2);
      expect($fruits.children()[0]).toBe($('.orange')[0]);
      expect($fruits.children()[1]).toBe($('.apple')[0]);
    });

    it('(elem) : should NOP if removed', () => {
      const $pear = $('.pear');
      const $plum = $('<li class="plum">Plum</li>');

      $pear.remove();
      $pear.replaceWith($plum);
      expect($('.orange').next().hasClass('plum')).toBe(false);
    });

    it('(elem) : should replace the single selected element with given element', () => {
      const $src = $('<h2>hi <span>there</span></h2>');
      const $new = $('<div>here</div>');
      const $replaced = $src.find('span').replaceWith($new);
      expect($new[0].parentNode).toBe($src[0]);
      expect($replaced[0].parentNode).toBe(null);
      expect($.html($src)).toBe('<h2>hi <div>here</div></h2>');
    });

    it('(self) : should be replaced after replacing it with itself', () => {
      const $a = load('<a>foo</a>', null, false);
      const replacement = '<a>bar</a>';
      $a('a').replaceWith((_, el: AnyNode) => el);
      $a('a').replaceWith(replacement);
      expect($a.html()).toBe(replacement);
    });

    it('(str) : should accept strings', () => {
      const $src = $('<h2>hi <span>there</span></h2>');
      const newStr = '<div>here</div>';
      const $replaced = $src.find('span').replaceWith(newStr);
      expect($replaced[0].parentNode).toBe(null);
      expect($.html($src)).toBe('<h2>hi <div>here</div></h2>');
    });

    it('(str) : should replace all selected elements', () => {
      const $src = $('<b>a<br>b<br>c<br>d</b>');
      const $replaced = $src.find('br').replaceWith(' ');
      expect($replaced[0].parentNode).toBe(null);
      expect($.html($src)).toBe('<b>a b c d</b>');
    });

    it('(fn) : should invoke the callback with the correct argument and context', () => {
      const origChildren = $fruits.children().get();
      const args: [number, AnyNode][] = [];
      const thisValues: AnyNode[] = [];

      $fruits.children().replaceWith(function (...myArgs) {
        args.push(myArgs);
        thisValues.push(this);
        return '<li class="first">';
      });

      expect(args).toStrictEqual([
        [0, origChildren[0]],
        [1, origChildren[1]],
        [2, origChildren[2]],
      ]);
      expect(thisValues).toStrictEqual([
        origChildren[0],
        origChildren[1],
        origChildren[2],
      ]);
    });

    it('(fn) : should replace the selected element with the returned string', () => {
      $fruits.children().replaceWith(() => '<li class="first">');

      expect($fruits.find('.first')).toHaveLength(3);
    });

    it('(fn) : should replace the selected element with the returned Cheerio object', () => {
      $fruits.children().replaceWith(() => $('<li class="second">'));

      expect($fruits.find('.second')).toHaveLength(3);
    });

    it('(fn) : should replace the selected element with the returned node', () => {
      $fruits.children().replaceWith(() => $('<li class="third">')[0]);

      expect($fruits.find('.third')).toHaveLength(3);
    });

    it('($(...)) : should remove from root element', () => {
      const $plum = $('<li class="plum">Plum</li>');
      const root = $plum[0].parent;
      expect(root?.type).toBe('root');

      $fruits.children().replaceWith($plum);
      expect($plum[0].parent?.type).not.toBe('root');
      expect(root?.childNodes).not.toContain($plum[0]);
    });
  });

  describe('.empty', () => {
    it('() : should remove all children from selected elements', () => {
      expect($fruits.children()).toHaveLength(3);

      $fruits.empty();
      expect($fruits.children()).toHaveLength(0);
    });

    it('() : should allow element reinsertion', () => {
      const $children = $fruits.children();

      $fruits.empty();
      expect($fruits.children()).toHaveLength(0);
      expect($children).toHaveLength(3);

      $fruits.append($('<div></div><div></div>'));
      const $remove = $fruits.children().eq(0);

      $remove.replaceWith($children);
      expect($fruits.children()).toHaveLength(4);
    });

    it("() : should destroy children's references to the parent", () => {
      const $children = $fruits.children();

      $fruits.empty();

      expect($children.eq(0).parent()).toHaveLength(0);
      expect($children.eq(0).next()).toHaveLength(0);
      expect($children.eq(0).prev()).toHaveLength(0);
      expect($children.eq(1).parent()).toHaveLength(0);
      expect($children.eq(1).next()).toHaveLength(0);
      expect($children.eq(1).prev()).toHaveLength(0);
      expect($children.eq(2).parent()).toHaveLength(0);
      expect($children.eq(2).next()).toHaveLength(0);
      expect($children.eq(2).prev()).toHaveLength(0);
    });

    it('() : should skip text nodes', () => {
      const $text = load(mixedText);
      const $body = $text($text('body')[0].children);

      $body.empty();

      expect($text('body').html()).toBe('<a></a>TEXT<b></b>');
    });

    it('() : should skip comment nodes', () => {
      const $comment = load('<a>1</a><!--Comment-->TEXT<b>2</b>');
      const $body = $comment($comment('body')[0].children);

      $body.empty();

      expect($comment('body').html()).toBe('<a></a><!--Comment-->TEXT<b></b>');
    });
  });

  describe('.html', () => {
    it('() : should get the innerHTML for an element', () => {
      expect($fruits.html()).toBe(
        [
          '<li class="apple">Apple</li>',
          '<li class="orange">Orange</li>',
          '<li class="pear">Pear</li>',
        ].join(''),
      );
    });

    it('() : should get innerHTML even if its just text', () => {
      expect($('.pear', '<li class="pear">Pear</li>').html()).toBe('Pear');
    });

    it('() : should return empty string if nothing inside', () => {
      expect($('li', '<li></li>').html()).toBe('');
    });

    it('(html) : should set the html for its children', () => {
      $fruits.html('<li class="durian">Durian</li>');
      const html = $fruits.html();
      expect(html).toBe('<li class="durian">Durian</li>');
    });

    it('(html) : should add new elements for each element in selection', () => {
      const $fruits = $('li');
      $fruits.html('<li class="durian">Durian</li>');
      let tested = 0;
      $fruits.each(function () {
        expect($(this).children().parent().get(0)).toBe(this);
        tested++;
      });
      expect(tested).toBe(3);
    });

    it('(html) : should skip text nodes', () => {
      const $text = load(mixedText);
      const $body = $text($text('body')[0].children);

      $body.html('test');

      expect($text('body').html()).toBe('<a>test</a>TEXT<b>test</b>');
    });

    it('(elem) : should set the html for its children with element', () => {
      $fruits.html($('<li class="durian">Durian</li>'));
      const html = $fruits.html();
      expect(html).toBe('<li class="durian">Durian</li>');
    });

    it('(elem) : should move the passed element (#940)', () => {
      $('.apple').html($('.orange'));
      expect($fruits.html()).toBe(
        '<li class="apple"><li class="orange">Orange</li></li><li class="pear">Pear</li>',
      );
    });

    it('() : should allow element reinsertion', () => {
      const $children = $fruits.children();

      $fruits.html('<div></div><div></div>');
      expect($fruits.children()).toHaveLength(2);

      const $remove = $fruits.children().eq(0);

      $remove.replaceWith($children);
      expect($fruits.children()).toHaveLength(4);
    });

    it('(script value) : should add content as text', () => {
      const $data = '<a><b>';
      const $script = $('<script>').html($data) as Cheerio<Element>;

      expect($script).toHaveLength(1);
      expect($script[0].type).toBe('script');
      expect($script[0]).toHaveProperty('name', 'script');

      expect($script[0].children).toHaveLength(1);
      expect($script[0].children[0].type).toBe('text');
      expect($script[0].children[0]).toHaveProperty('data', $data);
    });
  });

  describe('.toString', () => {
    it('() : should get the outerHTML for an element', () => {
      expect($fruits.toString()).toBe(fruits);
    });

    it('() : should return an html string for a set of elements', () => {
      expect($fruits.find('li').toString()).toBe(
        '<li class="apple">Apple</li><li class="orange">Orange</li><li class="pear">Pear</li>',
      );
    });

    it('() : should be called implicitly', () => {
      const string = [$('<foo>'), $('<bar>'), $('<baz>')].join('');
      expect(string).toBe('<foo></foo><bar></bar><baz></baz>');
    });

    it('() : should pass options', () => {
      const dom = load('&', { xml: { decodeEntities: false } });
      expect(dom.root().toString()).toBe('&');
    });
  });

  describe('.text', () => {
    it('() : gets the text for a single element', () => {
      expect($('.apple').text()).toBe('Apple');
    });

    it('() : combines all text from children text nodes', () => {
      expect($('#fruits').text()).toBe('AppleOrangePear');
    });

    it('(text) : sets the text for the child node', () => {
      $('.apple').text('Granny Smith Apple');
      expect($('.apple')[0].childNodes[0]).toHaveProperty(
        'data',
        'Granny Smith Apple',
      );
    });

    it('(text) : inserts separate nodes for all children', () => {
      $('li').text('Fruits');
      let tested = 0;
      $('li').each(function () {
        expect(this.childNodes[0].parentNode).toBe(this);
        tested++;
      });
      expect(tested).toBe(3);
    });

    it('(text) : should create a Node with the DOM level 1 API', () => {
      const $apple = $('.apple');

      $apple.text('anything');
      const textNode = $apple[0].childNodes[0];

      expect(textNode.parentNode).toBe($apple[0]);
      expect(textNode.nodeType).toBe(3);
      expect(textNode).toHaveProperty('data', 'anything');
    });

    it('(html) : should skip text nodes', () => {
      const $text = load(mixedText);
      const $body = $text($text('body')[0].children);

      $body.text('test');

      expect($text('body').html()).toBe('<a>test</a>TEXT<b>test</b>');
    });

    it('should allow functions as arguments', () => {
      $('.apple').text((idx, content) => {
        expect(idx).toBe(0);
        expect(content).toBe('Apple');
        return 'whatever mate';
      });
      expect($('.apple')[0].childNodes[0]).toHaveProperty(
        'data',
        'whatever mate',
      );
    });

    it('should allow functions as arguments for multiple elements', () => {
      $('li').text((idx) => `text${idx}`);
      $('li').each(function (this, idx) {
        expect(this.childNodes[0]).toHaveProperty('data', `text${idx}`);
      });
    });

    it('should decode special chars', () => {
      const text = $('<p>M&amp;M</p>').text();
      expect(text).toBe('M&M');
    });

    it('should work with special chars added as strings', () => {
      const text = $('<p>M&M</p>').text();
      expect(text).toBe('M&M');
    });

    it('should turn passed values to strings', () => {
      $('.apple').text(1 as never);
      expect($('.apple')[0].childNodes[0]).toHaveProperty('data', '1');
    });

    it('( undefined ) : should act as an accessor', () => {
      const $div = $('<div>test</div>');
      expect(typeof $div.text(undefined as never)).toBe('string');
      expect($div.text()).toBe('test');
    });

    it('( "" ) : should convert to string', () => {
      const $div = $('<div>test</div>');
      expect($div.text('').text()).toBe('');
    });

    it('( null ) : should convert to string', () => {
      expect(
        $('<div>')
          .text(null as never)
          .text(),
      ).toBe('null');
    });

    it('( 0 ) : should convert to string', () => {
      expect(
        $('<div>')
          .text(0 as never)
          .text(),
      ).toBe('0');
    });

    it('(str) should encode then decode unsafe characters', () => {
      const $apple = $('.apple');

      $apple.text('blah <script>alert("XSS!")</script> blah');
      expect($apple[0].childNodes[0]).toHaveProperty(
        'data',
        'blah <script>alert("XSS!")</script> blah',
      );
      expect($apple.text()).toBe('blah <script>alert("XSS!")</script> blah');

      $apple.text('blah <script>alert("XSS!")</script> blah');
      expect($apple.html()).not.toContain('<script>alert("XSS!")</script>');
    });
  });

  describe('.clone', () => {
    it('() : should return a copy', () => {
      const $src = $(
        '<div><span>foo</span><span>bar</span><span>baz</span></div>',
      ).children();
      const $elem = $src.clone();
      expect($elem.length).toBe(3);
      expect($elem.parent()).toHaveLength(0);
      expect($elem.text()).toBe($src.text());
      $src.text('rofl');
      expect($elem.text()).not.toBe($src.text());
    });

    it('() : should return a copy of document', () => {
      const $src = load('<html><body><div>foo</div>bar</body></html>')
        .root()
        .children();
      const $elem = $src.clone();
      expect($elem.length).toBe(1);
      expect($elem.parent()).toHaveLength(0);
      expect($elem.text()).toBe($src.text());
      $src.text('rofl');
      expect($elem.text()).not.toBe($src.text());
    });

    it('() : should preserve parsing options', () => {
      const $ = load('<div>π</div>', { xml: { decodeEntities: false } });
      const $div = $('div');

      expect($div.text()).toBe($div.clone().text());
    });
  });
});
