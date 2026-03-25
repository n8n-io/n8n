// Vendored from https://github.com/vuejs/vue/blob/612fb89547711cacb030a3893a0065b785802860/src/core/util/debug.js
// with types only changes.

// The MIT License (MIT)

// Copyright (c) 2013-present, Yuxi (Evan) You

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const classifyRE = /(?:^|[-_])(\w)/g;
const classify = (str) => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');

const ROOT_COMPONENT_NAME = '<Root>';
const ANONYMOUS_COMPONENT_NAME = '<Anonymous>';

const repeat = (str, n) => {
  return str.repeat(n);
};

const formatComponentName = (vm, includeFile) => {
  if (!vm) {
    return ANONYMOUS_COMPONENT_NAME;
  }

  if (vm.$root === vm) {
    return ROOT_COMPONENT_NAME;
  }

  // https://github.com/getsentry/sentry-javascript/issues/5204 $options can be undefined
  if (!vm.$options) {
    return ANONYMOUS_COMPONENT_NAME;
  }

  const options = vm.$options;

  let name = options.name || options._componentTag || options.__name;
  const file = options.__file;
  if (!name && file) {
    const match = file.match(/([^/\\]+)\.vue$/);
    if (match) {
      name = match[1];
    }
  }

  return (
    (name ? `<${classify(name)}>` : ANONYMOUS_COMPONENT_NAME) + (file && includeFile !== false ? ` at ${file}` : '')
  );
};

const generateComponentTrace = (vm) => {
  if (vm && (vm._isVue || vm.__isVue) && vm.$parent) {
    const tree = [];
    let currentRecursiveSequence = 0;
    while (vm) {
      if (tree.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const last = tree[tree.length - 1] ;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (last.constructor === vm.constructor) {
          currentRecursiveSequence++;
          vm = vm.$parent; // eslint-disable-line no-param-reassign
          continue;
        } else if (currentRecursiveSequence > 0) {
          tree[tree.length - 1] = [last, currentRecursiveSequence];
          currentRecursiveSequence = 0;
        }
      }
      tree.push(vm);
      vm = vm.$parent; // eslint-disable-line no-param-reassign
    }

    const formattedTree = tree
      .map(
        (vm, i) =>
          `${
            (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) +
            (Array.isArray(vm)
              ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
              : formatComponentName(vm))
          }`,
      )
      .join('\n');

    return `\n\nfound in\n\n${formattedTree}`;
  }

  return `\n\n(found in ${formatComponentName(vm)})`;
};

export { formatComponentName, generateComponentTrace };
//# sourceMappingURL=components.js.map
