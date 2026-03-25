const Stringifier = require('postcss/lib/stringifier');

module.exports = class ValuesStringifier extends Stringifier {
  static stringify(node, builder) {
    const stringifier = new ValuesStringifier(builder);
    stringifier.stringify(node);
  }

  basic(node, value) {
    const print = value || node.value;
    const after = node.raws.after ? this.raw(node, 'after') || '' : '';
    // NOTE: before is handled by postcss in stringifier.body

    this.builder(print, node, 'start');
    this.builder(after, node, 'end');
  }

  atword(...args) {
    this.atrule(...args);
  }

  comment(node) {
    if (node.inline) {
      const left = this.raw(node, 'left', 'commentLeft');
      const right = this.raw(node, 'right', 'commentRight');
      this.builder(`//${left}${node.text}${right}`, node);
    } else {
      super.comment(node);
    }
  }

  func(node) {
    const after = this.raw(node, 'after') || '';

    this.builder(`${node.name}(`, node, 'start');

    for (const child of node.nodes) {
      // since we're duplicating this.body here, we have to handle `before`
      // but we don't want the postcss default \n value, so check it's non-empty first
      const before = child.raws.before ? this.raw(child, 'before') : '';
      if (before) {
        this.builder(before);
      }
      this.stringify(child);
    }

    this.builder(`)${after}`, node, 'end');
  }

  interpolation(node) {
    this.basic(node, node.prefix + node.params);
  }

  numeric(node) {
    const print = node.value + node.unit;
    this.basic(node, print);
  }

  operator(node) {
    this.basic(node);
  }

  punctuation(node) {
    this.basic(node);
  }

  quoted(node) {
    this.basic(node);
  }

  unicodeRange(node) {
    this.basic(node);
  }

  word(node) {
    this.basic(node);
  }
};
