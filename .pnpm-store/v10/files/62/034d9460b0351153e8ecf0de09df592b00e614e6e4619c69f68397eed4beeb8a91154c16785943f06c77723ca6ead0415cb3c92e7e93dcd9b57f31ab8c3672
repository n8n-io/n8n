import { describe, it, expect, beforeEach } from 'vitest';
import { load, type CheerioAPI } from '../index.js';
import { Cheerio } from '../cheerio.js';
import { type AnyNode, type Element, type Text, isText } from 'domhandler';
import {
  cheerio,
  food,
  fruits,
  eleven,
  drinks,
  text,
  forms,
  mixedText,
  vegetables,
} from '../__fixtures__/fixtures.js';

function getText(el: Cheerio<Element>) {
  if (el.length === 0) return undefined;
  const [firstChild] = el[0].childNodes;
  return isText(firstChild) ? firstChild.data : undefined;
}

describe('$(...)', () => {
  let $: CheerioAPI;

  beforeEach(() => {
    $ = load(fruits);
  });

  describe('.load', () => {
    it('should throw a TypeError if given invalid input', () => {
      expect(() => {
        (load as any)();
      }).toThrow('cheerio.load() expects a string');
    });
  });

  describe('.find', () => {
    it('() : should find nothing', () => {
      expect($('ul').find()).toHaveLength(0);
    });

    it('(single) : should find one descendant', () => {
      expect($('#fruits').find('.apple')[0].attribs).toHaveProperty(
        'class',
        'apple',
      );
    });

    // #1679 - text tags not filtered
    it('(single) : should filter out text nodes', () => {
      const $root = $(`<html>\n${fruits.replace(/></g, '>\n<')}\n</html>`);
      expect($root.find('.apple')[0].attribs).toHaveProperty('class', 'apple');
    });

    it('(many) : should find all matching descendant', () => {
      expect($('#fruits').find('li')).toHaveLength(3);
    });

    it('(many) : should merge all selected elems with matching descendants', () => {
      expect($('#fruits, #food', food).find('.apple')).toHaveLength(1);
    });

    it('(invalid single) : should return empty if cant find', () => {
      expect($('ul').find('blah')).toHaveLength(0);
    });

    it('(invalid single) : should query descendants only', () => {
      expect($('#fruits').find('ul')).toHaveLength(0);
    });

    it('should return empty if search already empty result', () => {
      expect($('#not-fruits').find('li')).toHaveLength(0);
    });

    it('should lowercase selectors', () => {
      expect($('#fruits').find('LI')).toHaveLength(3);
    });

    it('should query immediate descendant only', () => {
      const q = load('<foo><bar><bar></bar><bar></bar></bar></foo>');
      expect(q('foo').find('> bar')).toHaveLength(1);
    });

    it('should find siblings', () => {
      const q = load('<p class=a><p class=b></p>');
      expect(q('.a').find('+.b')).toHaveLength(1);
      expect(q('.a').find('~.b')).toHaveLength(1);
      expect(q('.a').find('+.a')).toHaveLength(0);
      expect(q('.a').find('~.a')).toHaveLength(0);
    });

    it('should query case-sensitively when in xml mode', () => {
      const q = load('<caseSenSitive allTheWay>', { xml: true });
      expect(q('caseSenSitive')).toHaveLength(1);
      expect(q('[allTheWay]')).toHaveLength(1);
      expect(q('casesensitive')).toHaveLength(0);
      expect(q('[alltheway]')).toHaveLength(0);
    });

    it('should throw an Error if given an invalid selector', () => {
      expect(() => {
        $('#fruits').find(':bah');
      }).toThrow('Unknown pseudo-class :bah');
    });

    it('should respect the `lowerCaseTags` option (#3495)', () => {
      const q = load(
        `<parentTag class="myClass">
          <firstTag> <child> blah </child> </firstTag>
          <secondTag> <child> blah </child> </secondTag>
        </parentTag> `,
        {
          xml: {
            xmlMode: true,
            decodeEntities: false,
            lowerCaseTags: true,
            lowerCaseAttributeNames: false,
            recognizeSelfClosing: true,
          },
        },
      );
      expect(q('.myClass').find('firstTag > child')).toHaveLength(1);
    });

    describe('(cheerio object) :', () => {
      it('returns only those nodes contained within the current selection', () => {
        const q = load(food);
        const $selection = q('#fruits').find(q('li'));

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe(q('.apple')[0]);
        expect($selection[1]).toBe(q('.orange')[0]);
        expect($selection[2]).toBe(q('.pear')[0]);
      });
      it('returns only those nodes contained within any element in the current selection', () => {
        const q = load(food);
        const $selection = q('.apple, #vegetables').find(q('li'));

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe(q('.carrot')[0]);
        expect($selection[1]).toBe(q('.sweetcorn')[0]);
      });
    });

    describe('(node) :', () => {
      it('returns node when contained within the current selection', () => {
        const q = load(food);
        const $selection = q('#fruits').find(q('.apple')[0]);

        expect($selection).toHaveLength(1);
        expect($selection[0]).toBe(q('.apple')[0]);
      });
      it('returns node when contained within any element the current selection', () => {
        const q = load(food);
        const $selection = q('#fruits, #vegetables').find(q('.carrot')[0]);

        expect($selection).toHaveLength(1);
        expect($selection[0]).toBe(q('.carrot')[0]);
      });
      it('does not return node that is not contained within the current selection', () => {
        const q = load(food);
        const $selection = q('#fruits').find(q('.carrot')[0]);

        expect($selection).toHaveLength(0);
      });
    });
  });

  describe('.children', () => {
    it('() : should get all children', () => {
      expect($('ul').children()).toHaveLength(3);
    });

    it('() : should skip text nodes', () => {
      expect($(mixedText).children()).toHaveLength(0);
    });

    it('() : should return children of all matched elements', () => {
      expect($('ul ul', food).children()).toHaveLength(5);
    });

    it('(selector) : should return children matching selector', () => {
      const { attribs } = $('ul').children('.orange')[0];
      expect(attribs).toHaveProperty('class', 'orange');
    });

    it('(invalid selector) : should return empty', () => {
      expect($('ul').children('.lulz')).toHaveLength(0);
    });

    it('should only match immediate children, not ancestors', () => {
      expect($(food).children('li')).toHaveLength(0);
    });
  });

  describe('.contents', () => {
    beforeEach(() => {
      $ = load(text);
    });

    it('() : should get all contents', () => {
      expect($('p').contents()).toHaveLength(5);
    });

    it('() : should skip text nodes', () => {
      expect($(mixedText).contents()).toHaveLength(2);
    });

    it('() : should include text nodes', () => {
      expect($('p').contents().first()[0].type).toBe('text');
    });

    it('() : should include comment nodes', () => {
      expect($('p').contents().last()[0].type).toBe('comment');
    });
  });

  describe('.next', () => {
    it('() : should return next element', () => {
      const { attribs } = $('.orange').next()[0];
      expect(attribs).toHaveProperty('class', 'pear');
    });

    it('() : should skip text nodes', () => {
      expect($(mixedText).next()[0]).toHaveProperty('name', 'b');
    });

    it('(no next) : should return empty for last child', () => {
      expect($('.pear').next()).toHaveLength(0);
    });

    it('(next on empty object) : should return empty', () => {
      expect($('.banana').next()).toHaveLength(0);
    });

    it('() : should operate over all elements in the selection', () => {
      expect($('.apple, .orange', food).next()).toHaveLength(2);
    });

    it('() : should return elements in order', () => {
      const result = load(eleven)('.red').next();
      expect(result).toHaveLength(2);
      expect(result.eq(0).text()).toBe('Six');
      expect(result.eq(1).text()).toBe('Ten');
    });

    it('should reject elements that violate the filter', () => {
      expect($('.apple').next('.non-existent')).toHaveLength(0);
    });

    it('should accept elements that satisify the filter', () => {
      expect($('.apple').next('.orange')).toHaveLength(1);
    });

    describe('(selector) :', () => {
      it('should reject elements that violate the filter', () => {
        expect($('.apple').next('.non-existent')).toHaveLength(0);
      });

      it('should accept elements that satisify the filter', () => {
        expect($('.apple').next('.orange')).toHaveLength(1);
      });
    });
  });

  describe('.nextAll', () => {
    it('() : should return all following siblings', () => {
      const elems = $('.apple').nextAll();
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
      expect(elems[1].attribs).toHaveProperty('class', 'pear');
    });

    it('(no next) : should return empty for last child', () => {
      expect($('.pear').nextAll()).toHaveLength(0);
    });

    it('(nextAll on empty object) : should return empty', () => {
      expect($('.banana').nextAll()).toHaveLength(0);
    });

    it('() : should operate over all elements in the selection', () => {
      expect($('.apple, .carrot', food).nextAll()).toHaveLength(3);
    });

    it('() : should not contain duplicate elements', () => {
      const elems = $('.apple, .orange', food);
      expect(elems.nextAll()).toHaveLength(2);
    });

    it('() : should not contain text elements', () => {
      const elems = $('.apple', fruits.replace(/></g, '>\n<'));
      expect(elems.nextAll()).toHaveLength(2);
    });

    describe('(selector) :', () => {
      it('should filter according to the provided selector', () => {
        expect($('.apple').nextAll('.pear')).toHaveLength(1);
      });

      it("should not consider siblings' contents when filtering", () => {
        expect($('#fruits', food).nextAll('li')).toHaveLength(0);
      });
    });
  });

  describe('.nextUntil', () => {
    it('() : should return all following siblings if no selector specified', () => {
      const elems = $('.apple', food).nextUntil();
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
      expect(elems[1].attribs).toHaveProperty('class', 'pear');
    });

    it('() : should filter out non-element nodes', () => {
      const elems = $('<div><div></div><!-- comment -->text<div></div></div>');
      const div = elems.children().eq(0);
      expect(div.nextUntil()).toHaveLength(1);
    });

    it('() : should operate over all elements in the selection', () => {
      const elems = $('.apple, .carrot', food);
      expect(elems.nextUntil()).toHaveLength(3);
    });

    it('() : should not contain duplicate elements', () => {
      const elems = $('.apple, .orange', food);
      expect(elems.nextUntil()).toHaveLength(2);
    });

    it('(selector) : should return all following siblings until selector', () => {
      const elems = $('.apple', food).nextUntil('.pear');
      expect(elems).toHaveLength(1);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
    });

    it('(selector) : should support selector matching multiple elements', () => {
      const elems = $('#disabled', forms).nextUntil('option, #unnamed');
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('id', 'submit');
      expect(elems[1].attribs).toHaveProperty('id', 'select');
    });

    it('(selector not sibling) : should return all following siblings', () => {
      const elems = $('.apple').nextUntil('#vegetables');
      expect(elems).toHaveLength(2);
    });

    it('(selector, filterString) : should return all following siblings until selector, filtered by filter', () => {
      const elems = $('.beer', drinks).nextUntil('.water', '.milk');
      expect(elems).toHaveLength(1);
      expect(elems[0].attribs).toHaveProperty('class', 'milk');
    });

    it('(null, filterString) : should return all following siblings until selector, filtered by filter', () => {
      const elems = $('<ul><li></li><li><p></p></li></ul>');
      const empty = elems.find('li').eq(0).nextUntil(null, 'p');
      expect(empty).toHaveLength(0);
    });

    it('() : should return an empty object for last child', () => {
      expect($('.pear').nextUntil()).toHaveLength(0);
    });

    it('() : should return an empty object when called on an empty object', () => {
      expect($('.banana').nextUntil()).toHaveLength(0);
    });

    it('(node) : should return all following siblings until the node', () => {
      const $fruits = $('#fruits').children();
      const elems = $fruits.eq(0).nextUntil($fruits[2]);
      expect(elems).toHaveLength(1);
    });

    it('(cheerio object) : should return all following siblings until any member of the cheerio object', () => {
      const $drinks = $(drinks).children();
      const $until = $([$drinks[4], $drinks[3]]);
      const elems = $drinks.eq(0).nextUntil($until);
      expect(elems).toHaveLength(2);
    });
  });

  describe('.prev', () => {
    it('() : should return previous element', () => {
      const { attribs } = $('.orange').prev()[0];
      expect(attribs).toHaveProperty('class', 'apple');
    });

    it('() : should skip text nodes', () => {
      expect($($(mixedText)[2]).prev()[0]).toHaveProperty('name', 'a');
    });

    it('(no prev) : should return empty for first child', () => {
      expect($('.apple').prev()).toHaveLength(0);
    });

    it('(prev on empty object) : should return empty', () => {
      expect($('.banana').prev()).toHaveLength(0);
    });

    it('() : should operate over all elements in the selection', () => {
      expect($('.orange, .pear', food).prev()).toHaveLength(2);
    });

    it('() : should maintain elements order', () => {
      const sel = load(eleven)('.sel');
      expect(sel).toHaveLength(3);
      expect(sel.eq(0).text()).toBe('Three');
      expect(sel.eq(1).text()).toBe('Nine');
      expect(sel.eq(2).text()).toBe('Eleven');

      // Swap last elements
      const el = sel[2];
      sel[2] = sel[1];
      sel[1] = el;

      const result = sel.prev();
      expect(result).toHaveLength(3);
      expect(result.eq(0).text()).toBe('Two');
      expect(result.eq(1).text()).toBe('Ten');
      expect(result.eq(2).text()).toBe('Eight');
    });

    describe('(selector) :', () => {
      it('should reject elements that violate the filter', () => {
        expect($('.orange').prev('.non-existent')).toHaveLength(0);
      });

      it('should accept elements that satisify the filter', () => {
        expect($('.orange').prev('.apple')).toHaveLength(1);
      });

      it('(selector) : should reject elements that violate the filter', () => {
        expect($('.orange').prev('.non-existent')).toHaveLength(0);
      });

      it('(selector) : should accept elements that satisify the filter', () => {
        expect($('.orange').prev('.apple')).toHaveLength(1);
      });
    });
  });

  describe('.prevAll', () => {
    it('() : should return all preceding siblings', () => {
      const elems = $('.pear').prevAll();
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
      expect(elems[1].attribs).toHaveProperty('class', 'apple');
    });

    it('() : should not contain text elements', () => {
      const elems = $('.pear', fruits.replace(/></g, '>\n<'));
      expect(elems.prevAll()).toHaveLength(2);
    });

    it('(no prev) : should return empty for first child', () => {
      expect($('.apple').prevAll()).toHaveLength(0);
    });

    it('(prevAll on empty object) : should return empty', () => {
      expect($('.banana').prevAll()).toHaveLength(0);
    });

    it('() : should operate over all elements in the selection', () => {
      expect($('.orange, .sweetcorn', food).prevAll()).toHaveLength(2);
    });

    it('() : should not contain duplicate elements', () => {
      const elems = $('.orange, .pear', food);
      expect(elems.prevAll()).toHaveLength(2);
    });

    describe('(selector) :', () => {
      it('should filter returned elements', () => {
        const elems = $('.pear').prevAll('.apple');
        expect(elems).toHaveLength(1);
      });

      it("should not consider siblings's descendents", () => {
        const elems = $('#vegetables', food).prevAll('li');
        expect(elems).toHaveLength(0);
      });
    });
  });

  describe('.prevUntil', () => {
    it('() : should return all preceding siblings if no selector specified', () => {
      const elems = $('.pear').prevUntil();
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
      expect(elems[1].attribs).toHaveProperty('class', 'apple');
    });

    it('() : should filter out non-element nodes', () => {
      const elems = $(
        '<div class="1"><div class="2"></div><!-- comment -->text<div class="3"></div></div>',
      );
      const div = elems.children().last();
      expect(div.prevUntil()).toHaveLength(1);
    });

    it('() : should operate over all elements in the selection', () => {
      const elems = $('.pear, .sweetcorn', food);
      expect(elems.prevUntil()).toHaveLength(3);
    });

    it('() : should not contain duplicate elements', () => {
      const elems = $('.orange, .pear', food);
      expect(elems.prevUntil()).toHaveLength(2);
    });

    it('(selector) : should return all preceding siblings until selector', () => {
      const elems = $('.pear').prevUntil('.apple');
      expect(elems).toHaveLength(1);
      expect(elems[0].attribs).toHaveProperty('class', 'orange');
    });

    it('(selector) : should support selector matching multiple elements', () => {
      const elems = $('#unnamed', forms).prevUntil('option, #disabled');
      expect(elems).toHaveLength(2);
      expect(elems[0].attribs).toHaveProperty('id', 'select');
      expect(elems[1].attribs).toHaveProperty('id', 'submit');
    });

    it('(selector not sibling) : should return all preceding siblings', () => {
      const elems = $('.sweetcorn', food).prevUntil('#fruits');
      expect(elems).toHaveLength(1);
      expect(elems[0].attribs).toHaveProperty('class', 'carrot');
    });

    it('(selector, filterString) : should return all preceding siblings until selector, filtered by filter', () => {
      const elems = $('.cider', drinks).prevUntil('.juice', '.water');
      expect(elems).toHaveLength(1);
      expect(elems[0].attribs).toHaveProperty('class', 'water');
    });

    it('(selector, filterString) : should return all preceding siblings until selector', () => {
      const elems = $('<ul><li><p></p></li><li></li></ul>');
      const empty = elems.find('li').eq(1).prevUntil(null, 'p');
      expect(empty).toHaveLength(0);
    });

    it('() : should return an empty object for first child', () => {
      expect($('.apple').prevUntil()).toHaveLength(0);
    });

    it('() : should return an empty object when called on an empty object', () => {
      expect($('.banana').prevUntil()).toHaveLength(0);
    });

    it('(node) : should return all previous siblings until the node', () => {
      const $fruits = $('#fruits').children();
      const elems = $fruits.eq(2).prevUntil($fruits[0]);
      expect(elems).toHaveLength(1);
    });

    it('(cheerio object) : should return all previous siblings until any member of the cheerio object', () => {
      const $drinks = $(drinks).children();
      const $until = $([$drinks[0], $drinks[1]]);
      const elems = $drinks.eq(4).prevUntil($until);
      expect(elems).toHaveLength(2);
    });
  });

  describe('.siblings', () => {
    it('() : should get all the siblings', () => {
      expect($('.orange').siblings()).toHaveLength(2);
      expect($('#fruits').siblings()).toHaveLength(0);
      expect($('.apple, .carrot', food).siblings()).toHaveLength(3);
    });

    it('(selector) : should get all siblings that match the selector', () => {
      expect($('.orange').siblings('.apple')).toHaveLength(1);
      expect($('.orange').siblings('.peach')).toHaveLength(0);
    });

    it('(selector) : should throw an Error if given an invalid selector', () => {
      expect(() => {
        $('.orange').siblings(':bah');
      }).toThrow('Unknown pseudo-class :bah');
    });

    it('(selector) : does not consider the contents of siblings when filtering (GH-374)', () => {
      expect($('#fruits', food).siblings('li')).toHaveLength(0);
    });

    it('() : when two elements are siblings to each other they have to be included', () => {
      const result = load(eleven)('.sel').siblings();
      expect(result).toHaveLength(7);
      expect(result.eq(0).text()).toBe('One');
      expect(result.eq(1).text()).toBe('Two');
      expect(result.eq(2).text()).toBe('Four');
      expect(result.eq(3).text()).toBe('Eight');
      expect(result.eq(4).text()).toBe('Nine');
      expect(result.eq(5).text()).toBe('Ten');
      expect(result.eq(6).text()).toBe('Eleven');
    });

    it('(selector) : when two elements are siblings to each other they have to be included', () => {
      const result = load(eleven)('.sel').siblings('.red');
      expect(result).toHaveLength(2);
      expect(result.eq(0).text()).toBe('Four');
      expect(result.eq(1).text()).toBe('Nine');
    });

    it('(cheerio) : test filtering with cheerio object', () => {
      const doc = load(eleven);
      const result = doc('.sel').siblings(doc(':not([class])'));
      expect(result).toHaveLength(4);
      expect(result.eq(0).text()).toBe('One');
      expect(result.eq(1).text()).toBe('Two');
      expect(result.eq(2).text()).toBe('Eight');
      expect(result.eq(3).text()).toBe('Ten');
    });
  });

  describe('.parents', () => {
    beforeEach(() => {
      $ = load(food);
    });

    it('() : should get all of the parents in logical order', () => {
      const orange = $('.orange').parents();
      expect(orange).toHaveLength(4);
      expect(orange[0].attribs).toHaveProperty('id', 'fruits');
      expect(orange[1].attribs).toHaveProperty('id', 'food');
      expect(orange[2].tagName).toBe('body');
      expect(orange[3].tagName).toBe('html');
      const fruits = $('#fruits').parents();
      expect(fruits).toHaveLength(3);
      expect(fruits[0].attribs).toHaveProperty('id', 'food');
      expect(fruits[1].tagName).toBe('body');
      expect(fruits[2].tagName).toBe('html');
    });

    it('(selector) : should get all of the parents that match the selector in logical order', () => {
      const fruits = $('.orange').parents('#fruits');
      expect(fruits).toHaveLength(1);
      expect(fruits[0].attribs).toHaveProperty('id', 'fruits');
      const uls = $('.orange').parents('ul');
      expect(uls).toHaveLength(2);
      expect(uls[0].attribs).toHaveProperty('id', 'fruits');
      expect(uls[1].attribs).toHaveProperty('id', 'food');
    });

    it('() : should not break if the selector does not have any results', () => {
      const result = $('.saladbar').parents();
      expect(result).toHaveLength(0);
    });

    it('() : should return an empty set for top-level elements', () => {
      const result = $('html').parents();
      expect(result).toHaveLength(0);
    });

    it('() : should return the parents of every element in the *reveresed* collection, omitting duplicates', () => {
      const $parents = $('li').parents();

      expect($parents).toHaveLength(5);
      expect($parents[0]).toBe($('#vegetables')[0]);
      expect($parents[1]).toBe($('#fruits')[0]);
      expect($parents[2]).toBe($('#food')[0]);
      expect($parents[3]).toBe($('body')[0]);
      expect($parents[4]).toBe($('html')[0]);
    });
  });

  describe('.parentsUntil', () => {
    beforeEach(() => {
      $ = load(food);
    });

    it('() : should get all of the parents in logical order', () => {
      const result = $('.orange').parentsUntil();
      expect(result).toHaveLength(4);
      expect(result[0].attribs).toHaveProperty('id', 'fruits');
      expect(result[1].attribs).toHaveProperty('id', 'food');
      expect(result[2].tagName).toBe('body');
      expect(result[3].tagName).toBe('html');
    });

    it('() : should get all of the parents in reversed order, omitting duplicates', () => {
      const result = $('.apple, .sweetcorn').parentsUntil();
      expect(result).toHaveLength(5);
      expect(result[0]).toBe($('#vegetables')[0]);
      expect(result[1]).toBe($('#fruits')[0]);
      expect(result[2]).toBe($('#food')[0]);
      expect(result[3]).toBe($('body')[0]);
      expect(result[4]).toBe($('html')[0]);
    });

    it('(selector) : should get all of the parents until selector', () => {
      const food = $('.orange').parentsUntil('#food');
      expect(food).toHaveLength(1);
      expect(food[0].attribs).toHaveProperty('id', 'fruits');
      const fruits = $('.orange').parentsUntil('#fruits');
      expect(fruits).toHaveLength(0);
    });

    it('(selector) : Less simple parentsUntil check with selector', () => {
      const result = $('#fruits').parentsUntil('html, body');
      expect(result.eq(0).attr('id')).toBe('food');
    });

    it('(selector not parent) : should return all parents', () => {
      const result = $('.orange').parentsUntil('.apple');
      expect(result).toHaveLength(4);
      expect(result[0].attribs).toHaveProperty('id', 'fruits');
      expect(result[1].attribs).toHaveProperty('id', 'food');
      expect(result[2].tagName).toBe('body');
      expect(result[3].tagName).toBe('html');
    });

    it('(selector, filter) : should get all of the parents that match the filter', () => {
      const result = $('.apple, .sweetcorn').parentsUntil(
        '.saladbar',
        '#vegetables',
      );
      expect(result).toHaveLength(1);
      expect(result[0].attribs).toHaveProperty('id', 'vegetables');
    });

    it('(selector, filter) : Multiple-filtered parentsUntil check', () => {
      const result = $('.orange').parentsUntil('html', 'ul,body');
      expect(result).toHaveLength(3);
      expect(result.eq(0).attr('id')).toBe('fruits');
      expect(result.eq(1).attr('id')).toBe('food');
      expect(result.eq(2).prop('tagName')).toBe('BODY');
    });

    it('() : should return empty object when called on an empty object', () => {
      const result = $('.saladbar').parentsUntil();
      expect(result).toHaveLength(0);
    });

    it('() : should return an empty set for top-level elements', () => {
      const result = $('html').parentsUntil();
      expect(result).toHaveLength(0);
    });

    it('(cheerio object) : should return all parents until any member of the cheerio object', () => {
      const $fruits = $('#fruits');
      const $until = $('#food');
      const result = $fruits.children().eq(1).parentsUntil($until);
      expect(result).toHaveLength(1);
      expect(result[0].attribs).toHaveProperty('id', 'fruits');
    });

    it('(cheerio object) : should return all parents until body element', () => {
      const body = $('body')[0];
      const result = $('.carrot').parentsUntil(body);
      expect(result).toHaveLength(2);
      expect(result.eq(0).is('ul#vegetables')).toBe(true);
    });
  });

  describe('.parent', () => {
    it('() : should return the parent of each matched element', () => {
      let result = $('.orange').parent();
      expect(result).toHaveLength(1);
      expect(result[0].attribs).toHaveProperty('id', 'fruits');
      result = $('li', food).parent();
      expect(result).toHaveLength(2);
      expect(result[0].attribs).toHaveProperty('id', 'fruits');
      expect(result[1].attribs).toHaveProperty('id', 'vegetables');
    });

    it('(undefined) : should not throw an exception', () => {
      expect(() => {
        $('li').parent(undefined);
      }).not.toThrow();
    });

    it('() : should return an empty object for top-level elements', () => {
      const result = $('html').parent();
      expect(result).toHaveLength(0);
    });

    it('() : should not contain duplicate elements', () => {
      const result = $('li').parent();
      expect(result).toHaveLength(1);
    });

    it('(selector) : should filter the matched parent elements by the selector', () => {
      const parents = $('.orange').parent();
      expect(parents).toHaveLength(1);
      expect(parents[0].attribs).toHaveProperty('id', 'fruits');
      const fruits = $('li', food).parent('#fruits');
      expect(fruits).toHaveLength(1);
      expect(fruits[0].attribs).toHaveProperty('id', 'fruits');
    });
  });

  describe('.closest', () => {
    it('() : should return an empty array', () => {
      const result = $('.orange').closest();
      expect(result).toHaveLength(0);
      expect(result).toBeInstanceOf(Cheerio);
    });

    it('(selector) : should find the closest element that matches the selector, searching through its ancestors and itself', () => {
      expect($('.orange').closest('.apple')).toHaveLength(0);
      expect(
        ($('.orange', food).closest('#food')[0] as Element).attribs,
      ).toHaveProperty('id', 'food');
      expect(
        ($('.orange', food).closest('ul')[0] as Element).attribs,
      ).toHaveProperty('id', 'fruits');
      expect(
        ($('.orange', food).closest('li')[0] as Element).attribs,
      ).toHaveProperty('class', 'orange');
    });

    it('(selector) : should find the closest element of each item, removing duplicates', () => {
      const result = $('li', food).closest('ul');
      expect(result).toHaveLength(2);
    });

    it('() : should not break if the selector does not have any results', () => {
      const result = $('.saladbar', food).closest('ul');
      expect(result).toHaveLength(0);
    });

    it('(selector) : should find closest element for text nodes', () => {
      const textNode = $('.apple', food).contents().first();
      const result = textNode.closest('#food') as Cheerio<Element>;
      expect(result[0].attribs).toHaveProperty('id', 'food');
    });
  });

  describe('.each', () => {
    it('( (i, elem) -> ) : should loop selected returning fn with (i, elem)', () => {
      const items: Element[] = [];
      const classes = ['apple', 'orange', 'pear'];
      $('li').each(function (idx, elem) {
        items[idx] = elem;
        expect(this.attribs).toHaveProperty('class', classes[idx]);
      });
      expect(items[0].attribs).toHaveProperty('class', 'apple');
      expect(items[1].attribs).toHaveProperty('class', 'orange');
      expect(items[2].attribs).toHaveProperty('class', 'pear');
    });

    it('( (i, elem) -> ) : should break iteration when the iterator function returns false', () => {
      let iterationCount = 0;
      $('li').each((idx) => {
        iterationCount++;
        return idx < 1;
      });

      expect(iterationCount).toBe(2);
    });
  });

  if (typeof Symbol !== 'undefined') {
    describe('[Symbol.iterator]', () => {
      it('should yield each element', () => {
        // The equivalent of: for (const element of $('li')) ...
        const $li = $('li');
        const iterator = $li[Symbol.iterator]();
        expect(iterator.next().value.attribs).toHaveProperty('class', 'apple');
        expect(iterator.next().value.attribs).toHaveProperty('class', 'orange');
        expect(iterator.next().value.attribs).toHaveProperty('class', 'pear');
        expect(iterator.next().done).toBe(true);
      });
    });
  }

  describe('.map', () => {
    it('(fn) : should be invoked with the correct arguments and context', () => {
      const $fruits = $('li');
      const args: [number, AnyNode][] = [];
      const thisVals: AnyNode[] = [];

      $fruits.map(function (...myArgs) {
        args.push(myArgs);
        thisVals.push(this);
        return undefined;
      });

      expect(args).toStrictEqual([
        [0, $fruits[0]],
        [1, $fruits[1]],
        [2, $fruits[2]],
      ]);
      expect(thisVals).toStrictEqual([$fruits[0], $fruits[1], $fruits[2]]);
    });

    it('(fn) : should return an Cheerio object wrapping the returned items', () => {
      const $fruits = $('li');
      const $mapped = $fruits.map((i) => $fruits[2 - i]);

      expect($mapped).toHaveLength(3);
      expect($mapped[0]).toBe($fruits[2]);
      expect($mapped[1]).toBe($fruits[1]);
      expect($mapped[2]).toBe($fruits[0]);
    });

    it('(fn) : should ignore `null` and `undefined` returned by iterator', () => {
      const $fruits = $('li');
      const retVals = [null, undefined, $fruits[1]];

      const $mapped = $fruits.map((i) => retVals[i]);

      expect($mapped).toHaveLength(1);
      expect($mapped[0]).toBe($fruits[1]);
    });

    it('(fn) : should preform a shallow merge on arrays returned by iterator', () => {
      const $fruits = $('li');

      const $mapped = $fruits.map(() => [1, [3, 4]]);

      expect($mapped.get()).toStrictEqual([1, [3, 4], 1, [3, 4], 1, [3, 4]]);
    });

    it('(fn) : should tolerate `null` and `undefined` when flattening arrays returned by iterator', () => {
      const $fruits = $('li');

      const $mapped = $fruits.map(() => [null, undefined]);

      expect($mapped.get()).toStrictEqual([
        null,
        undefined,
        null,
        undefined,
        null,
        undefined,
      ]);
    });
  });

  describe('.filter', () => {
    it('(selector) : should reduce the set of matched elements to those that match the selector', () => {
      const pear = $('li').filter('.pear').text();
      expect(pear).toBe('Pear');
    });

    it('(selector) : should not consider nested elements', () => {
      const lis = $('#fruits').filter('li');
      expect(lis).toHaveLength(0);
    });

    it('(selection) : should reduce the set of matched elements to those that are contained in the provided selection', () => {
      const $fruits = $('li');
      const $pear = $fruits.filter('.pear, .apple');
      expect($fruits.filter($pear)).toHaveLength(2);
    });

    it('(element) : should reduce the set of matched elements to those that specified directly', () => {
      const $fruits = $('li');
      const pear = $fruits.filter('.pear')[0];
      expect($fruits.filter(pear)).toHaveLength(1);
    });

    it("(fn) : should reduce the set of matched elements to those that pass the function's test", () => {
      const orange = $('li')
        .filter(function (i, el) {
          expect(this).toBe(el);
          expect(el.tagName).toBe('li');
          expect(typeof i).toBe('number');
          return $(this).attr('class') === 'orange';
        })
        .text();

      expect(orange).toBe('Orange');
    });

    it('should also iterate over text nodes (#1867)', () => {
      const text = $('<a>a</a>b<c></c>').filter((_, el): el is Text =>
        isText(el),
      );

      expect(text[0].data).toBe('b');
    });
  });

  describe('.not', () => {
    it('(selector) : should reduce the set of matched elements to those that do not match the selector', () => {
      const $fruits = $('li');

      const $notPear = $fruits.not('.pear');

      expect($notPear).toHaveLength(2);
      expect($notPear[0]).toBe($fruits[0]);
      expect($notPear[1]).toBe($fruits[1]);
    });

    it('(selector) : should not consider nested elements', () => {
      const lis = $('#fruits').not('li');
      expect(lis).toHaveLength(1);
    });

    it('(selection) : should reduce the set of matched elements to those that are mot contained in the provided selection', () => {
      const $fruits = $('li');
      const $orange = $('.orange');

      const $notOrange = $fruits.not($orange);

      expect($notOrange).toHaveLength(2);
      expect($notOrange[0]).toBe($fruits[0]);
      expect($notOrange[1]).toBe($fruits[2]);
    });

    it('(element) : should reduce the set of matched elements to those that specified directly', () => {
      const $fruits = $('li');
      const apple = $('.apple')[0];

      const $notApple = $fruits.not(apple);

      expect($notApple).toHaveLength(2);
      expect($notApple[0]).toBe($fruits[1]);
      expect($notApple[1]).toBe($fruits[2]);
    });

    it("(fn) : should reduce the set of matched elements to those that do not pass the function's test", () => {
      const $fruits = $('li');

      const $notOrange = $fruits.not(function (i, el) {
        expect(this).toBe(el);
        expect(el).toHaveProperty('name', 'li');
        expect(typeof i).toBe('number');
        return $(this).attr('class') === 'orange';
      });

      expect($notOrange).toHaveLength(2);
      expect($notOrange[0]).toBe($fruits[0]);
      expect($notOrange[1]).toBe($fruits[2]);
    });
  });

  describe('.has', () => {
    beforeEach(() => {
      $ = load(food);
    });

    it('(selector) : should reduce the set of matched elements to those with descendants that match the selector', () => {
      const $fruits = $('#fruits,#vegetables').has('.pear');
      expect($fruits).toHaveLength(1);
      expect($fruits[0]).toBe($('#fruits')[0]);
    });

    it('(selector) : should only consider nested elements', () => {
      const $empty = $('#fruits').has('#fruits');
      expect($empty).toHaveLength(0);
    });

    it('(element) : should reduce the set of matched elements to those that are ancestors of the provided element', () => {
      const $fruits = $('#fruits,#vegetables').has($('.pear')[0]);
      expect($fruits).toHaveLength(1);
      expect($fruits[0]).toBe($('#fruits')[0]);
    });

    it('(element) : should only consider nested elements', () => {
      const $fruits = $('#fruits');
      const fruitsEl = $fruits[0];
      const $empty = $fruits.has(fruitsEl);

      expect($empty).toHaveLength(0);
    });
  });

  describe('.first', () => {
    it('() : should return the first item', () => {
      const $src = $(
        '<span>foo</span><span>bar</span><span>baz</span>',
      ) as Cheerio<Element>;
      const $elem = $src.first();
      expect($elem.length).toBe(1);
      expect($elem[0].childNodes[0]).toHaveProperty('data', 'foo');
    });

    it('() : should return an empty object for an empty object', () => {
      const $src = $();
      const $first = $src.first();
      expect($first.length).toBe(0);
      expect($first[0]).toBeUndefined();
    });
  });

  describe('.last', () => {
    it('() : should return the last element', () => {
      const $src = $(
        '<span>foo</span><span>bar</span><span>baz</span>',
      ) as Cheerio<Element>;
      const $elem = $src.last();
      expect($elem.length).toBe(1);
      expect($elem[0].childNodes[0]).toHaveProperty('data', 'baz');
    });

    it('() : should return an empty object for an empty object', () => {
      const $src = $();
      const $last = $src.last();
      expect($last.length).toBe(0);
      expect($last[0]).toBeUndefined();
    });
  });

  describe('.first & .last', () => {
    it('() : should return equivalent collections if only one element', () => {
      const $src = $('<span>bar</span>') as Cheerio<Element>;
      const $first = $src.first();
      const $last = $src.last();
      expect($first.length).toBe(1);
      expect($first[0].childNodes[0]).toHaveProperty('data', 'bar');
      expect($last.length).toBe(1);
      expect($last[0].childNodes[0]).toHaveProperty('data', 'bar');
      expect($first[0]).toBe($last[0]);
    });
  });

  describe('.eq', () => {
    it('(i) : should return the element at the specified index', () => {
      expect(getText($('li').eq(0))).toBe('Apple');
      expect(getText($('li').eq(1))).toBe('Orange');
      expect(getText($('li').eq(2))).toBe('Pear');
      expect(getText($('li').eq(3))).toBeUndefined();
      expect(getText($('li').eq(-1))).toBe('Pear');
    });
  });

  describe('.get', () => {
    it('(i) : should return the element at the specified index', () => {
      const children = $('#fruits').children();
      expect(children.get(0)).toBe(children[0]);
      expect(children.get(1)).toBe(children[1]);
      expect(children.get(2)).toBe(children[2]);
    });

    it('(-1) : should return the element indexed from the end of the collection', () => {
      const children = $('#fruits').children();
      expect(children.get(-1)).toBe(children[2]);
      expect(children.get(-2)).toBe(children[1]);
      expect(children.get(-3)).toBe(children[0]);
    });

    it('() : should return an array containing all of the collection', () => {
      const children = $('#fruits').children();
      const all = children.get();
      expect(Array.isArray(all)).toBe(true);
      expect(all).toStrictEqual([children[0], children[1], children[2]]);
    });
  });

  describe('.index', () => {
    describe('() :', () => {
      it('returns the index of a child amongst its siblings', () => {
        expect($('.orange').index()).toBe(1);
      });
      it('returns -1 when the selection has no parent', () => {
        expect($('<div/>').index()).toBe(-1);
      });
    });

    describe('(selector) :', () => {
      it('returns the index of the first element in the set matched by `selector`', () => {
        expect($('.apple').index('#fruits, li')).toBe(1);
      });
      it('returns -1 when the item is not present in the set matched by `selector`', () => {
        expect($('.apple').index('#fuits')).toBe(-1);
      });
      it('returns -1 when the first element in the set has no parent', () => {
        expect($('<div/>').index('*')).toBe(-1);
      });
    });

    describe('(node) :', () => {
      it('returns the index of the given node within the current selection', () => {
        const $lis = $('li');
        expect($lis.index($lis.get(1))).toBe(1);
      });
      it('returns the index of the given node within the current selection when the current selection has no parent', () => {
        const $apple = $('.apple').remove();

        expect($apple.index($apple.get(0))).toBe(0);
      });
      it('returns -1 when the given node is not present in the current selection', () => {
        expect($('li').index($('#fruits').get(0))).toBe(-1);
      });
      it('returns -1 when the current selection is empty', () => {
        expect($('.not-fruit').index($('#fruits').get(0))).toBe(-1);
      });
    });

    describe('(selection) :', () => {
      it('returns the index of the first node in the provided selection within the current selection', () => {
        const $lis = $('li');
        expect($lis.index($('.orange, .pear'))).toBe(1);
      });
      it('returns -1 when the given node is not present in the current selection', () => {
        expect($('li').index($('#fruits'))).toBe(-1);
      });
      it('returns -1 when the current selection is empty', () => {
        expect($('.not-fruit').index($('#fruits'))).toBe(-1);
      });
    });
  });

  describe('.slice', () => {
    it('(start) : should return all elements after the given index', () => {
      const sliced = $('li').slice(1);
      expect(sliced).toHaveLength(2);
      expect(getText(sliced.eq(0))).toBe('Orange');
      expect(getText(sliced.eq(1))).toBe('Pear');
    });

    it('(start, end) : should return all elements matching the given range', () => {
      const sliced = $('li').slice(1, 2);
      expect(sliced).toHaveLength(1);
      expect(getText(sliced.eq(0))).toBe('Orange');
    });

    it('(-start) : should return element matching the offset from the end', () => {
      const sliced = $('li').slice(-1);
      expect(sliced).toHaveLength(1);
      expect(getText(sliced.eq(0))).toBe('Pear');
    });
  });

  describe('.end() :', () => {
    let $fruits: Cheerio<Element>;

    beforeEach(() => {
      $fruits = $('#fruits').children();
    });

    it('returns an empty object at the end of the chain', () => {
      expect($fruits.end().end().end()).toBeTruthy();
      expect($fruits.end().end().end()).toHaveLength(0);
    });
    it('find', () => {
      expect($fruits.find('.apple').end()).toBe($fruits);
    });
    it('filter', () => {
      expect($fruits.filter('.apple').end()).toBe($fruits);
    });
    it('map', () => {
      expect(
        $fruits
          .map(function () {
            return this;
          })
          .end(),
      ).toBe($fruits);
    });
    it('contents', () => {
      expect($fruits.contents().end()).toBe($fruits);
    });
    it('eq', () => {
      expect($fruits.eq(1).end()).toBe($fruits);
    });
    it('first', () => {
      expect($fruits.first().end()).toBe($fruits);
    });
    it('last', () => {
      expect($fruits.last().end()).toBe($fruits);
    });
    it('slice', () => {
      expect($fruits.slice(1).end()).toBe($fruits);
    });
    it('children', () => {
      expect($fruits.children().end()).toBe($fruits);
    });
    it('parent', () => {
      expect($fruits.parent().end()).toBe($fruits);
    });
    it('parents', () => {
      expect($fruits.parents().end()).toBe($fruits);
    });
    it('closest', () => {
      expect($fruits.closest('ul').end()).toBe($fruits);
    });
    it('siblings', () => {
      expect($fruits.siblings().end()).toBe($fruits);
    });
    it('next', () => {
      expect($fruits.next().end()).toBe($fruits);
    });
    it('nextAll', () => {
      expect($fruits.nextAll().end()).toBe($fruits);
    });
    it('prev', () => {
      expect($fruits.prev().end()).toBe($fruits);
    });
    it('prevAll', () => {
      expect($fruits.prevAll().end()).toBe($fruits);
    });
    it('clone', () => {
      expect($fruits.clone().end()).toBe($fruits);
    });
  });

  describe('.add()', () => {
    let $fruits: Cheerio<AnyNode>;
    let $apple: Cheerio<Element>;
    let $orange: Cheerio<Element>;
    let $pear: Cheerio<Element>;

    beforeEach(() => {
      $ = load(food);
      $fruits = $('#fruits');
      $apple = $('.apple');
      $orange = $('.orange');
      $pear = $('.pear');
    });

    describe('(selector) matched element :', () => {
      it('occurs before current selection', () => {
        const $selection = $orange.add('.apple');

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('is identical to the current selection', () => {
        const $selection = $orange.add('.orange');

        expect($selection).toHaveLength(1);
        expect($selection[0]).toBe($orange[0]);
      });
      it('occurs after current selection', () => {
        const $selection = $orange.add('.pear');

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($orange[0]);
        expect($selection[1]).toBe($pear[0]);
      });
      it('contains the current selection', () => {
        const $selection = $orange.add('#fruits');

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('is a child of the current selection', () => {
        const $selection = $fruits.add('.orange');

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('is root object preserved', () => {
        const $selection = $('<div></div>').add('#fruits');

        expect($selection).toHaveLength(2);
        expect($selection.eq(0).is('div')).toBe(true);
        expect($selection.eq(1).is($fruits.eq(0))).toBe(true);
      });
    });
    describe('(selector) matched elements :', () => {
      it('occur before the current selection', () => {
        const $selection = $pear.add('.apple, .orange');

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('include the current selection', () => {
        const $selection = $pear.add('#fruits li');

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur after the current selection', () => {
        const $selection = $apple.add('.orange, .pear');

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur within the current selection', () => {
        const $selection = $fruits.add('#fruits li');

        expect($selection).toHaveLength(4);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($apple[0]);
        expect($selection[2]).toBe($orange[0]);
        expect($selection[3]).toBe($pear[0]);
      });
    });
    describe('(selector, context) :', () => {
      it(', context)', () => {
        const $selection = $fruits.add('li', '#vegetables');
        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($('.carrot')[0]);
        expect($selection[2]).toBe($('.sweetcorn')[0]);
      });
    });

    describe('(element) honors document order when element occurs :', () => {
      it('before the current selection', () => {
        const $selection = $orange.add($apple[0]);

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('after the current selection', () => {
        const $selection = $orange.add($pear[0]);

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($orange[0]);
        expect($selection[1]).toBe($pear[0]);
      });
      it('within the current selection', () => {
        const $selection = $fruits.add($orange[0]);

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('as an ancestor of the current selection', () => {
        const $selection = $orange.add($fruits[0]);

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('does not insert an element already contained within the current selection', () => {
        const $selection = $apple.add($apple[0]);

        expect($selection).toHaveLength(1);
        expect($selection[0]).toBe($apple[0]);
      });
    });
    describe('([elements]) : elements', () => {
      it('occur before the current selection', () => {
        const $selection = $pear.add($('.apple, .orange').get());

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('include the current selection', () => {
        const $selection = $pear.add($('#fruits li').get());

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur after the current selection', () => {
        const $selection = $apple.add($('.orange, .pear').get());

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur within the current selection', () => {
        const $selection = $fruits.add($('#fruits li').get());

        expect($selection).toHaveLength(4);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($apple[0]);
        expect($selection[2]).toBe($orange[0]);
        expect($selection[3]).toBe($pear[0]);
      });
    });

    /**
     * Element order is undefined in this case, so it should not be asserted
     * here.
     *
     * If the collection consists of elements from different documents or ones
     * not in any document, the sort order is undefined.
     *
     * @see {@link https://api.jquery.com/add/}
     */
    it('(html) : correctly parses and adds the new elements', () => {
      const $selection = $apple.add('<li class="banana">banana</li>');

      expect($selection).toHaveLength(2);
      expect($selection.is('.apple')).toBe(true);
      expect($selection.is('.banana')).toBe(true);
    });

    describe('(selection) element in selection :', () => {
      it('occurs before current selection', () => {
        const $selection = $orange.add($('.apple'));

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('is identical to the current selection', () => {
        const $selection = $orange.add($('.orange'));

        expect($selection).toHaveLength(1);
        expect($selection[0]).toBe($orange[0]);
      });
      it('occurs after current selection', () => {
        const $selection = $orange.add($('.pear'));

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($orange[0]);
        expect($selection[1]).toBe($pear[0]);
      });
      it('contains the current selection', () => {
        const $selection = $orange.add($('#fruits'));

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
      it('is a child of the current selection', () => {
        const $selection = $fruits.add($('.orange'));

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($orange[0]);
      });
    });
    describe('(selection) elements in the selection :', () => {
      it('occur before the current selection', () => {
        const $selection = $pear.add($('.apple, .orange'));

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('include the current selection', () => {
        const $selection = $pear.add($('#fruits li'));

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur after the current selection', () => {
        const $selection = $apple.add($('.orange, .pear'));

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($apple[0]);
        expect($selection[1]).toBe($orange[0]);
        expect($selection[2]).toBe($pear[0]);
      });
      it('occur within the current selection', () => {
        const $selection = $fruits.add($('#fruits li'));

        expect($selection).toHaveLength(4);
        expect($selection[0]).toBe($fruits[0]);
        expect($selection[1]).toBe($apple[0]);
        expect($selection[2]).toBe($orange[0]);
        expect($selection[3]).toBe($pear[0]);
      });
    });

    describe('(selection) :', () => {
      it('modifying nested selections should not impact the parent [#834]', () => {
        const apple_pear = $apple.add($pear);

        // Applies red to apple and pear
        apple_pear.addClass('red');

        expect($apple.hasClass('red')).toBe(true); // This is true
        expect($pear.hasClass('red')).toBe(true); // This is true

        // Applies green to pear... AND should not affect apple
        $pear.addClass('green');
        expect($pear.hasClass('green')).toBe(true); // Currently this is true
        expect($apple.hasClass('green')).toBe(false); // And this should be false!
      });
    });
  });

  describe('.addBack', () => {
    describe('() :', () => {
      it('includes siblings and self', () => {
        const $selection = $('.orange').siblings().addBack();

        expect($selection).toHaveLength(3);
        expect($selection[0]).toBe($('.apple')[0]);
        expect($selection[1]).toBe($('.orange')[0]);
        expect($selection[2]).toBe($('.pear')[0]);
      });
      it('includes children and self', () => {
        const $selection = $('#fruits').children().addBack();

        expect($selection).toHaveLength(4);
        expect($selection[0]).toBe($('#fruits')[0]);
        expect($selection[1]).toBe($('.apple')[0]);
        expect($selection[2]).toBe($('.orange')[0]);
        expect($selection[3]).toBe($('.pear')[0]);
      });
      it('includes parent and self', () => {
        const $selection = $('.apple').parent().addBack();

        expect($selection).toHaveLength(2);
        expect($selection[0]).toBe($('#fruits')[0]);
        expect($selection[1]).toBe($('.apple')[0]);
      });
      it('includes parents and self', () => {
        const q = load(food);
        const $selection = q('.apple').parents().addBack();

        expect($selection).toHaveLength(5);
        expect($selection[0]).toBe(q('html')[0]);
        expect($selection[1]).toBe(q('body')[0]);
        expect($selection[2]).toBe(q('#food')[0]);
        expect($selection[3]).toBe(q('#fruits')[0]);
        expect($selection[4]).toBe(q('.apple')[0]);
      });
    });
    it('(filter) : filters the previous selection', () => {
      const $selection = $('li').eq(1).addBack('.apple');

      expect($selection).toHaveLength(2);
      expect($selection[0]).toBe($('.apple')[0]);
      expect($selection[1]).toBe($('.orange')[0]);
    });
    it('() : fails gracefully when no args are passed', () => {
      const $div = cheerio('<div>');
      expect($div.addBack()).toBe($div);
    });
  });

  describe('.is', () => {
    it('() : should return false', () => {
      expect($('li.apple').is()).toBe(false);
    });

    it('(true selector) : should return true', () => {
      expect(cheerio('#vegetables', vegetables).is('ul')).toBe(true);
    });

    it('(false selector) : should return false', () => {
      expect(cheerio('#vegetables', vegetables).is('div')).toBe(false);
    });

    it('(true selection) : should return true', () => {
      const $vegetables = cheerio('li', vegetables);
      expect($vegetables.is($vegetables.eq(1))).toBe(true);
    });

    it('(false selection) : should return false', () => {
      const $vegetableList = cheerio(vegetables);
      const $vegetables = $vegetableList.find('li');
      expect($vegetables.is($vegetableList)).toBe(false);
    });

    it('(true element) : should return true', () => {
      const $vegetables = cheerio('li', vegetables);
      expect($vegetables.is($vegetables[0])).toBe(true);
    });

    it('(false element) : should return false', () => {
      const $vegetableList = cheerio(vegetables);
      const $vegetables = $vegetableList.find('li');
      expect($vegetables.is($vegetableList[0])).toBe(false);
    });

    it('(true predicate) : should return true', () => {
      const result = $('li').is(function () {
        return this.tagName === 'li' && $(this).hasClass('pear');
      });
      expect(result).toBe(true);
    });

    it('(false predicate) : should return false', () => {
      const result = $('li')
        .last()
        .is(function () {
          return this.tagName === 'ul';
        });
      expect(result).toBe(false);
    });
  });
});
