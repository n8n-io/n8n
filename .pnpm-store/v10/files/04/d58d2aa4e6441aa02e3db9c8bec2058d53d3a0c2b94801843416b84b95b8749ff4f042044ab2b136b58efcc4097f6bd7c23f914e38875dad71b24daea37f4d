var DEFAULTS = {
  '*': {
    colors: {
      opacity: true // rgba / hsla
    },
    properties: {
      backgroundClipMerging: true, // background-clip to shorthand
      backgroundOriginMerging: true, // background-origin to shorthand
      backgroundSizeMerging: true, // background-size to shorthand
      colors: true, // any kind of color transformations, like `#ff00ff` to `#f0f` or `#fff` into `red`
      ieBangHack: false, // !ie suffix hacks on IE<8
      ieFilters: false, // whether to preserve `filter` and `-ms-filter` properties
      iePrefixHack: false, // underscore / asterisk prefix hacks on IE
      ieSuffixHack: false, // \9 suffix hacks on IE6-9
      merging: true, // merging properties into one
      shorterLengthUnits: false, // optimize pixel units into `pt`, `pc` or `in` units
      spaceAfterClosingBrace: true, // 'url() no-repeat' to 'url()no-repeat'
      urlQuotes: false, // whether to wrap content of `url()` into quotes or not
      zeroUnits: true // 0[unit] -> 0
    },
    selectors: {
      adjacentSpace: false, // div+ nav Android stock browser hack
      ie7Hack: false, // *+html hack
      mergeablePseudoClasses: [
        ':active',
        ':after',
        ':before',
        ':empty',
        ':checked',
        ':disabled',
        ':empty',
        ':enabled',
        ':first-child',
        ':first-letter',
        ':first-line',
        ':first-of-type',
        ':focus',
        ':hover',
        ':lang',
        ':last-child',
        ':last-of-type',
        ':link',
        ':not',
        ':nth-child',
        ':nth-last-child',
        ':nth-last-of-type',
        ':nth-of-type',
        ':only-child',
        ':only-of-type',
        ':root',
        ':target',
        ':visited'
      ], // selectors with these pseudo-classes can be merged as these are universally supported
      mergeablePseudoElements: [
        '::after',
        '::before',
        '::first-letter',
        '::first-line'
      ], // selectors with these pseudo-elements can be merged as these are universally supported
      mergeLimit: 8191, // number of rules that can be safely merged together
      multiplePseudoMerging: true
    },
    units: {
      ch: true,
      in: true,
      pc: true,
      pt: true,
      rem: true,
      vh: true,
      vm: true, // vm is vmin on IE9+ see https://developer.mozilla.org/en-US/docs/Web/CSS/length
      vmax: true,
      vmin: true,
      vw: true
    }
  }
};

DEFAULTS.ie11 = DEFAULTS['*'];

DEFAULTS.ie10 = DEFAULTS['*'];

DEFAULTS.ie9 = merge(DEFAULTS['*'], {
  properties: {
    ieFilters: true,
    ieSuffixHack: true
  }
});

DEFAULTS.ie8 = merge(DEFAULTS.ie9, {
  colors: {
    opacity: false
  },
  properties: {
    backgroundClipMerging: false,
    backgroundOriginMerging: false,
    backgroundSizeMerging: false,
    iePrefixHack: true,
    merging: false
  },
  selectors: {
    mergeablePseudoClasses: [
      ':after',
      ':before',
      ':first-child',
      ':first-letter',
      ':focus',
      ':hover',
      ':visited'
    ],
    mergeablePseudoElements: []
  },
  units: {
    ch: false,
    rem: false,
    vh: false,
    vm: false,
    vmax: false,
    vmin: false,
    vw: false
  }
});

DEFAULTS.ie7 = merge(DEFAULTS.ie8, {
  properties: {
    ieBangHack: true
  },
  selectors: {
    ie7Hack: true,
    mergeablePseudoClasses: [
      ':first-child',
      ':first-letter',
      ':hover',
      ':visited'
    ]
  },
});

function compatibilityFrom(source) {
  return merge(DEFAULTS['*'], calculateSource(source));
}

function merge(source, target) {
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      var value = source[key];

      if (Object.prototype.hasOwnProperty.call(target, key) && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = merge(value, target[key] || {});
      } else {
        target[key] = key in target ? target[key] : value;
      }
    }
  }

  return target;
}

function calculateSource(source) {
  if (typeof source == 'object')
    return source;

  if (!/[,\+\-]/.test(source))
    return DEFAULTS[source] || DEFAULTS['*'];

  var parts = source.split(',');
  var template = parts[0] in DEFAULTS ?
    DEFAULTS[parts.shift()] :
    DEFAULTS['*'];

  source = {};

  parts.forEach(function (part) {
    var isAdd = part[0] == '+';
    var key = part.substring(1).split('.');
    var group = key[0];
    var option = key[1];

    source[group] = source[group] || {};
    source[group][option] = isAdd;
  });

  return merge(template, source);
}

module.exports = compatibilityFrom;
