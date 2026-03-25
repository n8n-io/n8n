import { describe, it, expect } from 'vitest';
import type { Document, Element } from 'domhandler';
import { getParse } from './parse.js';

import { parseDocument as parseWithHtmlparser2 } from 'htmlparser2';
import { parseWithParse5 } from './parsers/parse5-adapter.js';

const defaultOpts = { _useHtmlParser2: false };

const parse = getParse((content, options, isDocument, context) =>
  options._useHtmlParser2
    ? parseWithHtmlparser2(content, options)
    : parseWithParse5(content, options, isDocument, context),
);

// Tags
const basic = '<html></html>';
const siblings = '<h2></h2><p></p>';

// Single Tags
const single = '<br/>';
const singleWrong = '<br>';

// Children
const children = '<html><br/></html>';
const li = '<li class="durian">Durian</li>';

// Attributes
const attributes = '<img src="hello.png" alt="man waving">';
const noValueAttribute = '<textarea disabled></textarea>';

// Comments
const comment = '<!-- sexy -->';
const conditional =
  '<!--[if IE 8]><html class="no-js ie8" lang="en"><![endif]-->';

// Text
const text = 'lorem ipsum';

// Script
const script = '<script type="text/javascript">alert("hi world!");</script>';
const scriptEmpty = '<script></script>';

// Style
const style = '<style type="text/css"> h2 { color:blue; } </style>';
const styleEmpty = '<style></style>';

// Directives
const directive = '<!doctype html>';

function rootTest(root: Document) {
  expect(root).toHaveProperty('type', 'root');

  expect(root.nextSibling).toBe(null);
  expect(root.previousSibling).toBe(null);
  expect(root.parentNode).toBe(null);

  const child = root.childNodes[0];
  expect(child.parentNode).toBe(root);
}

describe('parse', () => {
  describe('evaluate', () => {
    it(`should parse basic empty tags: ${basic}`, () => {
      const [tag] = parse(basic, defaultOpts, true, null).children as Element[];
      expect(tag.type).toBe('tag');
      expect(tag.tagName).toBe('html');
      expect(tag.childNodes).toHaveLength(2);
    });

    it(`should handle sibling tags: ${siblings}`, () => {
      const dom = parse(siblings, defaultOpts, false, null)
        .children as Element[];
      const [h2, p] = dom;

      expect(dom).toHaveLength(2);
      expect(h2.tagName).toBe('h2');
      expect(p.tagName).toBe('p');
    });

    it(`should handle single tags: ${single}`, () => {
      const [tag] = parse(single, defaultOpts, false, null)
        .children as Element[];
      expect(tag.type).toBe('tag');
      expect(tag.tagName).toBe('br');
      expect(tag.childNodes).toHaveLength(0);
    });

    it(`should handle malformatted single tags: ${singleWrong}`, () => {
      const [tag] = parse(singleWrong, defaultOpts, false, null)
        .children as Element[];
      expect(tag.type).toBe('tag');
      expect(tag.tagName).toBe('br');
      expect(tag.childNodes).toHaveLength(0);
    });

    it(`should handle tags with children: ${children}`, () => {
      const [tag] = parse(children, defaultOpts, true, null)
        .children as Element[];
      expect(tag.type).toBe('tag');
      expect(tag.tagName).toBe('html');
      expect(tag.childNodes).toBeTruthy();
      expect(tag.childNodes[1]).toHaveProperty('tagName', 'body');
      expect((tag.childNodes[1] as Element).childNodes).toHaveLength(1);
    });

    it(`should handle tags with children: ${li}`, () => {
      const [tag] = parse(li, defaultOpts, false, null).children as Element[];
      expect(tag.childNodes).toHaveLength(1);
      expect(tag.childNodes[0]).toHaveProperty('data', 'Durian');
    });

    it(`should handle tags with attributes: ${attributes}`, () => {
      const attrs = parse(attributes, defaultOpts, false, null)
        .children[0] as Element;
      expect(attrs.attribs).toBeTruthy();
      expect(attrs.attribs).toHaveProperty('src', 'hello.png');
      expect(attrs.attribs).toHaveProperty('alt', 'man waving');
    });

    it(`should handle value-less attributes: ${noValueAttribute}`, () => {
      const attrs = parse(noValueAttribute, defaultOpts, false, null)
        .children[0] as Element;
      expect(attrs.attribs).toBeTruthy();
      expect(attrs.attribs).toHaveProperty('disabled', '');
    });

    it(`should handle comments: ${comment}`, () => {
      const elem = parse(comment, defaultOpts, false, null).children[0];
      expect(elem.type).toBe('comment');
      expect(elem).toHaveProperty('data', ' sexy ');
    });

    it(`should handle conditional comments: ${conditional}`, () => {
      const elem = parse(conditional, defaultOpts, false, null).children[0];
      expect(elem.type).toBe('comment');
      expect(elem).toHaveProperty(
        'data',
        conditional.replace('<!--', '').replace('-->', ''),
      );
    });

    it(`should handle text: ${text}`, () => {
      const text_ = parse(text, defaultOpts, false, null).children[0];
      expect(text_.type).toBe('text');
      expect(text_).toHaveProperty('data', 'lorem ipsum');
    });

    it(`should handle script tags: ${script}`, () => {
      const script_ = parse(script, defaultOpts, false, null)
        .children[0] as Element;
      expect(script_.type).toBe('script');
      expect(script_.tagName).toBe('script');
      expect(script_.attribs).toHaveProperty('type', 'text/javascript');
      expect(script_.childNodes).toHaveLength(1);
      expect(script_.childNodes[0].type).toBe('text');
      expect(script_.childNodes[0]).toHaveProperty(
        'data',
        'alert("hi world!");',
      );
    });

    it(`should handle style tags: ${style}`, () => {
      const style_ = parse(style, defaultOpts, false, null)
        .children[0] as Element;
      expect(style_.type).toBe('style');
      expect(style_.tagName).toBe('style');
      expect(style_.attribs).toHaveProperty('type', 'text/css');
      expect(style_.childNodes).toHaveLength(1);
      expect(style_.childNodes[0].type).toBe('text');
      expect(style_.childNodes[0]).toHaveProperty(
        'data',
        ' h2 { color:blue; } ',
      );
    });

    it(`should handle directives: ${directive}`, () => {
      const elem = parse(directive, defaultOpts, true, null).children[0];
      expect(elem.type).toBe('directive');
      expect(elem).toHaveProperty('data', '!DOCTYPE html');
      expect(elem).toHaveProperty('name', '!doctype');
    });
  });

  describe('.parse', () => {
    // Root test utility

    it(`should add root to: ${basic}`, () => {
      const root = parse(basic, defaultOpts, true, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0]).toHaveProperty('tagName', 'html');
    });

    it(`should add root to: ${siblings}`, () => {
      const root = parse(siblings, defaultOpts, false, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(2);
      expect(root.childNodes[0]).toHaveProperty('tagName', 'h2');
      expect(root.childNodes[1]).toHaveProperty('tagName', 'p');
      expect(root.childNodes[1].parent).toBe(root);
    });

    it(`should add root to: ${comment}`, () => {
      const root = parse(comment, defaultOpts, false, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0].type).toBe('comment');
    });

    it(`should add root to: ${text}`, () => {
      const root = parse(text, defaultOpts, false, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0].type).toBe('text');
    });

    it(`should add root to: ${scriptEmpty}`, () => {
      const root = parse(scriptEmpty, defaultOpts, false, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0].type).toBe('script');
    });

    it(`should add root to: ${styleEmpty}`, () => {
      const root = parse(styleEmpty, defaultOpts, false, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0].type).toBe('style');
    });

    it(`should add root to: ${directive}`, () => {
      const root = parse(directive, defaultOpts, true, null);
      rootTest(root);
      expect(root.childNodes).toHaveLength(2);
      expect(root.childNodes[0].type).toBe('directive');
    });

    it('should simply return root', () => {
      const oldroot = parse(basic, defaultOpts, true, null);
      const root = parse(oldroot, defaultOpts, true, null);
      expect(root).toBe(oldroot);
      rootTest(root);
      expect(root.childNodes).toHaveLength(1);
      expect(root.childNodes[0]).toHaveProperty('tagName', 'html');
    });

    it('should expose the DOM level 1 API', () => {
      const root = parse(
        '<div><a></a><span></span><p></p></div>',
        defaultOpts,
        false,
        null,
      ).childNodes[0] as Element;
      const childNodes = root.childNodes as Element[];

      expect(childNodes).toHaveLength(3);

      expect(root.tagName).toBe('div');
      expect(root.firstChild).toBe(childNodes[0]);
      expect(root.lastChild).toBe(childNodes[2]);

      expect(childNodes[0].tagName).toBe('a');
      expect(childNodes[0].previousSibling).toBe(null);
      expect(childNodes[0].nextSibling).toBe(childNodes[1]);
      expect(childNodes[0].parentNode).toBe(root);
      expect((childNodes[0] as Element).childNodes).toHaveLength(0);
      expect(childNodes[0].firstChild).toBe(null);
      expect(childNodes[0].lastChild).toBe(null);

      expect(childNodes[1].tagName).toBe('span');
      expect(childNodes[1].previousSibling).toBe(childNodes[0]);
      expect(childNodes[1].nextSibling).toBe(childNodes[2]);
      expect(childNodes[1].parentNode).toBe(root);
      expect(childNodes[1].childNodes).toHaveLength(0);
      expect(childNodes[1].firstChild).toBe(null);
      expect(childNodes[1].lastChild).toBe(null);

      expect(childNodes[2].tagName).toBe('p');
      expect(childNodes[2].previousSibling).toBe(childNodes[1]);
      expect(childNodes[2].nextSibling).toBe(null);
      expect(childNodes[2].parentNode).toBe(root);
      expect(childNodes[2].childNodes).toHaveLength(0);
      expect(childNodes[2].firstChild).toBe(null);
      expect(childNodes[2].lastChild).toBe(null);
    });

    it('Should parse less than or equal sign sign', () => {
      const root = parse('<i>A</i><=<i>B</i>', defaultOpts, false, null);
      const { childNodes } = root;

      expect(childNodes[0]).toHaveProperty('tagName', 'i');
      expect((childNodes[0] as Element).childNodes[0]).toHaveProperty(
        'data',
        'A',
      );
      expect(childNodes[1]).toHaveProperty('data', '<=');
      expect(childNodes[2]).toHaveProperty('tagName', 'i');
      expect((childNodes[2] as Element).childNodes[0]).toHaveProperty(
        'data',
        'B',
      );
    });

    it('Should ignore unclosed CDATA', () => {
      const root = parse(
        '<a></a><script>foo //<![CDATA[ bar</script><b></b>',
        defaultOpts,
        false,
        null,
      );
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].tagName).toBe('a');
      expect(childNodes[1].tagName).toBe('script');
      expect(childNodes[1].childNodes[0]).toHaveProperty(
        'data',
        'foo //<![CDATA[ bar',
      );
      expect(childNodes[2].tagName).toBe('b');
    });

    it('Should add <head> to documents', () => {
      const root = parse('<html></html>', defaultOpts, true, null);
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].tagName).toBe('html');
      expect(childNodes[0].childNodes[0]).toHaveProperty('tagName', 'head');
    });

    it('Should implicitly create <tr> around <td>', () => {
      const root = parse(
        '<table><td>bar</td></tr></table>',
        defaultOpts,
        false,
        null,
      );
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].tagName).toBe('table');
      expect(childNodes[0].childNodes.length).toBe(1);
      expect(childNodes[0].childNodes[0]).toHaveProperty('tagName', 'tbody');
      expect((childNodes[0] as any).childNodes[0].childNodes[0]).toHaveProperty(
        'tagName',
        'tr',
      );
      expect(
        (childNodes[0] as any).childNodes[0].childNodes[0].childNodes[0]
          .tagName,
      ).toBe('td');
      expect(
        (childNodes[0] as any).childNodes[0].childNodes[0].childNodes[0]
          .childNodes[0].data,
      ).toBe('bar');
    });

    it('Should parse custom tag <line>', () => {
      const root = parse('<line>test</line>', defaultOpts, false, null);
      const childNodes = root.childNodes as Element[];

      expect(childNodes.length).toBe(1);
      expect(childNodes[0].tagName).toBe('line');
      expect(childNodes[0].childNodes[0]).toHaveProperty('data', 'test');
    });

    it('Should properly parse misnested table tags', () => {
      const root = parse(
        '<tr><td>i1</td></tr><tr><td>i2</td></td></tr><tr><td>i3</td></td></tr>',
        defaultOpts,
        false,
        null,
      );
      const childNodes = root.childNodes as Element[];

      expect(childNodes.length).toBe(3);

      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        expect(child.tagName).toBe('tr');
        expect(child.childNodes[0]).toHaveProperty('tagName', 'td');
        expect((child.childNodes[0] as Element).childNodes[0]).toHaveProperty(
          'data',
          `i${i + 1}`,
        );
      }
    });

    it('Should correctly parse data url attributes', () => {
      const html =
        '<div style=\'font-family:"butcherman-caps"; src:url(data:font/opentype;base64,AAEA...);\'></div>';
      const expectedAttr =
        'font-family:"butcherman-caps"; src:url(data:font/opentype;base64,AAEA...);';
      const root = parse(html, defaultOpts, false, null);
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].attribs).toHaveProperty('style', expectedAttr);
    });

    it('Should treat <xmp> tag content as text', () => {
      const root = parse('<xmp><h2></xmp>', defaultOpts, false, null);
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].childNodes[0]).toHaveProperty('data', '<h2>');
    });

    it('Should correctly parse malformed numbered entities', () => {
      const root = parse('<p>z&#</p>', defaultOpts, false, null);
      const childNodes = root.childNodes as Element[];

      expect(childNodes[0].childNodes[0]).toHaveProperty('data', 'z&#');
    });

    it('Should correctly parse mismatched headings', () => {
      const root = parse('<h2>Test</h3><div></div>', defaultOpts, false, null);
      const { childNodes } = root;

      expect(childNodes.length).toBe(2);
      expect(childNodes[0]).toHaveProperty('tagName', 'h2');
      expect(childNodes[1]).toHaveProperty('tagName', 'div');
    });

    it('Should correctly parse tricky <pre> content', () => {
      const root = parse(
        '<pre>\nA <- factor(A, levels = c("c","a","b"))\n</pre>',
        defaultOpts,
        false,
        null,
      );
      const childNodes = root.childNodes as Element[];

      expect(childNodes.length).toBe(1);
      expect(childNodes[0].tagName).toBe('pre');
      expect(childNodes[0].childNodes[0]).toHaveProperty(
        'data',
        'A <- factor(A, levels = c("c","a","b"))\n',
      );
    });

    it('should pass the options for including the location info to parse5', () => {
      const root = parse(
        '<p>Hello</p>',
        { ...defaultOpts, sourceCodeLocationInfo: true },
        false,
        null,
      );
      const location = root.children[0].sourceCodeLocation;

      expect(typeof location).toBe('object');
      expect(location?.endOffset).toBe(12);
    });
  });
});
