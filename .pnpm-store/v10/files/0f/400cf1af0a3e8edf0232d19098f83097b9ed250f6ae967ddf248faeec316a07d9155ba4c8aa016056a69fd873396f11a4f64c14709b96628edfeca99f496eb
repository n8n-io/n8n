import { describe, it, expect, beforeEach } from 'vitest';
import { type CheerioAPI } from '../index.js';
import { cheerio, forms } from '../__fixtures__/fixtures.js';

describe('$(...)', () => {
  let $: CheerioAPI;

  beforeEach(() => {
    $ = cheerio.load(forms);
  });

  describe('.serializeArray', () => {
    it('() : should get form controls', () => {
      expect($('form#simple').serializeArray()).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
      ]);
    });

    it('() : should get nested form controls', () => {
      expect($('form#nested').serializeArray()).toHaveLength(2);
      const data = $('form#nested').serializeArray();
      data.sort((a, b) => (a.value > b.value ? 1 : -1));
      expect(data).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
        {
          name: 'vegetable',
          value: 'Carrot',
        },
      ]);
    });

    it('() : should not get disabled form controls', () => {
      expect($('form#disabled').serializeArray()).toStrictEqual([]);
    });

    it('() : should not get form controls with the wrong type', () => {
      expect($('form#submit').serializeArray()).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
      ]);
    });

    it('() : should get selected options', () => {
      expect($('form#select').serializeArray()).toStrictEqual([
        {
          name: 'fruit',
          value: 'Orange',
        },
      ]);
    });

    it('() : should not get unnamed form controls', () => {
      expect($('form#unnamed').serializeArray()).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
      ]);
    });

    it('() : should get multiple selected options', () => {
      expect($('form#multiple').serializeArray()).toHaveLength(2);
      const data = $('form#multiple').serializeArray();
      data.sort((a, b) => (a.value > b.value ? 1 : -1));
      expect(data).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
        {
          name: 'fruit',
          value: 'Orange',
        },
      ]);
    });

    it('() : should get individually selected elements', () => {
      const data = $('form#nested input').serializeArray();
      data.sort((a, b) => (a.value > b.value ? 1 : -1));
      expect(data).toStrictEqual([
        {
          name: 'fruit',
          value: 'Apple',
        },
        {
          name: 'vegetable',
          value: 'Carrot',
        },
      ]);
    });

    it('() : should standardize line breaks', () => {
      expect($('form#textarea').serializeArray()).toStrictEqual([
        {
          name: 'fruits',
          value: 'Apple\r\nOrange',
        },
      ]);
    });

    it("() : shouldn't serialize the empty string", () => {
      expect($('<input value=pineapple>').serializeArray()).toStrictEqual([]);
      expect(
        $('<input name="" value=pineapple>').serializeArray(),
      ).toStrictEqual([]);
      expect(
        $('<input name="fruit" value=pineapple>').serializeArray(),
      ).toStrictEqual([
        {
          name: 'fruit',
          value: 'pineapple',
        },
      ]);
    });

    it('() : should serialize inputs without value attributes', () => {
      expect($('<input name="fruit">').serializeArray()).toStrictEqual([
        {
          name: 'fruit',
          value: '',
        },
      ]);
    });
  });

  describe('.serialize', () => {
    it('() : should get form controls', () => {
      expect($('form#simple').serialize()).toBe('fruit=Apple');
    });

    it('() : should get nested form controls', () => {
      expect($('form#nested').serialize()).toBe('fruit=Apple&vegetable=Carrot');
    });

    it('() : should not get disabled form controls', () => {
      expect($('form#disabled').serialize()).toBe('');
    });

    it('() : should get multiple selected options', () => {
      expect($('form#multiple').serialize()).toBe('fruit=Apple&fruit=Orange');
    });

    it("() : should encode spaces as +'s", () => {
      expect($('form#spaces').serialize()).toBe('fruit=Blood+orange');
    });
  });
});
