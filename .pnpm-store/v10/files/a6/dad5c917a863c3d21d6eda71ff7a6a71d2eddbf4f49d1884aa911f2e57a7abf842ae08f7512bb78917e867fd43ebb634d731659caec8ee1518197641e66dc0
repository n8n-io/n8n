import { describe, it, expect } from 'vitest';
import { load } from '../index.js';
import type { CheerioOptions } from '../options.js';

function xml(str: string, options?: CheerioOptions) {
  options = { xml: true, ...options };
  const $ = load(str, options);
  return $.xml();
}

function dom(str: string, options?: CheerioOptions) {
  const $ = load('', options);
  return $(str).html();
}

describe('render', () => {
  describe('(xml)', () => {
    it('should render <media:thumbnail /> tags correctly', () => {
      const str =
        '<media:thumbnail url="http://www.foo.com/keyframe.jpg" width="75" height="50" time="12:05:01.123" />';
      expect(xml(str)).toBe(
        '<media:thumbnail url="http://www.foo.com/keyframe.jpg" width="75" height="50" time="12:05:01.123"/>',
      );
    });

    it('should render <link /> tags (RSS) correctly', () => {
      const str = '<link>http://www.github.com/</link>';
      expect(xml(str)).toBe('<link>http://www.github.com/</link>');
    });

    it('should escape entities', () => {
      const str = '<tag attr="foo &amp; bar"/>';
      expect(xml(str)).toBe(str);
    });

    it('should render HTML as XML', () => {
      const $ = load('<foo></foo>', null, false);
      expect($.xml()).toBe('<foo/>');
    });
  });

  describe('(dom)', () => {
    it('should not keep camelCase for new nodes', () => {
      const str = '<g><someElem someAttribute="something">hello</someElem></g>';
      expect(dom(str, { xml: false })).toBe(
        '<someelem someattribute="something">hello</someelem>',
      );
    });

    it('should keep camelCase for new nodes', () => {
      const str = '<g><someElem someAttribute="something">hello</someElem></g>';
      expect(dom(str, { xml: true })).toBe(
        '<someElem someAttribute="something">hello</someElem>',
      );
    });

    it('should maintain the parsing options of distinct contexts independently', () => {
      const str = '<g><someElem someAttribute="something">hello</someElem></g>';
      const $ = load('', { xml: false });

      expect($(str).html()).toBe(
        '<someelem someattribute="something">hello</someelem>',
      );
    });
  });
});
