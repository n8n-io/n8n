import { describe, it, expect } from 'vitest';
import { load } from './index.js';

describe('.load', () => {
  it('(html) : should retain original root after creating a new node', () => {
    const $ = load('<body><ul id="fruits"></ul></body>');
    expect($('body')).toHaveLength(1);
    $('<script>');
    expect($('body')).toHaveLength(1);
  });

  it('(html) : should handle lowercase tag options', () => {
    const $ = load('<BODY><ul id="fruits"></ul></BODY>', {
      xml: { lowerCaseTags: true },
    });
    expect($.html()).toBe('<body><ul id="fruits"/></body>');
  });

  it('(html) : should handle xml tag option', () => {
    const $ = load('<body><script><foo></script></body>', {
      xml: true,
    });
    expect($('script')[0].children[0].type).toBe('tag');
  });

  it('(buffer) : should accept a buffer', () => {
    const html = '<html><head></head><body>foo</body></html>';
    const $html = load(Buffer.from(html));
    expect($html.html()).toBe(html);
  });
});
